package com.rssolplan.edu.domain.notification;

import com.rssolplan.edu.domain.notification.dto.NotificationResponseDto;
import com.rssolplan.edu.domain.store.Store;
import com.rssolplan.edu.domain.store.StoreRepository;
import com.rssolplan.edu.domain.store.UserStore;
import com.rssolplan.edu.domain.store.UserStoreRepository;
import com.rssolplan.edu.domain.user.User;
import com.rssolplan.edu.domain.user.UserRepository;
import com.rssolplan.edu.global.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final UserStoreRepository userStoreRepository;
    private final NotificationRepository notificationRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    // 근무표 입력 요청 알림
    @Transactional
    public void sendScheduleInputRequest(Long requesterId,Long storeId, LocalDate startDate, LocalDate endDate) {

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없습니다."));

        User requester = userRepository.findById(requesterId).orElseThrow(() -> new IllegalArgumentException("요청자 유저를 찾을 수 없습니다."));

        List<UserStore> userStores = userStoreRepository.findByStore_Id(storeId);
        String periodText = formatPeriod(startDate, endDate);

        for (UserStore us : userStores) {
            if (us.getPosition() == UserStore.Position.OWNER) continue;

            Notification notification = Notification.builder()
                    .userId(us.getUser().getId()) //수신자
                    .requester(requester)       // 알림 requester발생자 (AppUser 엔티티)
                    .store(store)
                    .category(Notification.Category.SCHEDULE_INPUT)
                    .type(Notification.Type.SCHEDULE_INPUT_REQUEST)
                    .message(
                            "사장님이 " + periodText + " 근무표 입력을 요청했어요.\n" +
                                    "근무 가능한 시간을 기입해주세요!"
                    )
                    .isRead(false)
                    .build();

            notificationRepository.save(notification);
        }
    }

    private String formatPeriod(LocalDate startDate, LocalDate endDate) {
        return startDate.getMonthValue() + "/" + startDate.getDayOfMonth()
                + "-" +
                endDate.getMonthValue() + "/" + endDate.getDayOfMonth();
    }

    // 알림 조회 (status 포함)
    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getNotifications(Long userId) {
        if (userId == null) {
            throw new UnauthorizedException("인증 정보가 없습니다.");
        }

        // 엔티티 컬럼·enum이 테이블과 달라도 목록이 깨지지 않도록 공통 컬럼만 읽는다.
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id,
                       category,
                       target_type,
                       target_id,
                       type,
                       message,
                       is_read,
                       created_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                """, userId);

        List<NotificationResponseDto> dtos = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String category = mapCategory(asString(column(row, "category")));
            String type = mapType(asString(column(row, "type")));
            Long targetId = asLong(column(row, "target_id"));
            boolean swap = "TIMETABLE_SWAP".equals(category);
            boolean substitute = "SUBSTITUTE".equals(category);

            dtos.add(NotificationResponseDto.builder()
                    .id(asLong(column(row, "id")))
                    .category(category)
                    .type(type)
                    .message(asString(column(row, "message")))
                    .createdAt(asDateTime(column(row, "created_at")))
                    .targetType(mapTargetType(asString(column(row, "target_type"))))
                    .targetId(targetId)
                    .shiftSwapRequestId(swap ? targetId : null)
                    .extraShiftRequestId(substitute ? targetId : null)
                    .isRead(asBoolean(column(row, "is_read")))
                    .build());
        }
        return dtos;
    }

    private static String mapCategory(String category) {
        if (category == null) return null;
        return switch (category) {
            case "SWAP", "SHIFT_SWAP" -> "TIMETABLE_SWAP";
            case "EXTRA_SHIFT" -> "SUBSTITUTE";
            default -> category;
        };
    }

    private static String mapType(String type) {
        if (type == null) return null;
        return switch (type) {
            case "SHIFT_SWAP_REQUEST", "SWAP_REQUEST_RECEIVED" -> "TIMETABLE_SWAP_REQUEST";
            case "SHIFT_SWAP_NOTIFY_MANAGER", "SWAP_NOTIFY_MANAGER" -> "TIMETABLE_SWAP_NOTIFY_ADMIN";
            case "EXTRA_SHIFT_REQUEST_INVITE" -> "SUBSTITUTE_REQUEST_INVITE";
            case "EXTRA_SHIFT_NOTIFY_MANAGER", "SUBSTITUTE_NOTIFY_MANAGER" -> "SUBSTITUTE_NOTIFY_ADMIN";
            default -> type;
        };
    }

    private static String mapTargetType(String targetType) {
        if (targetType == null) return null;
        return switch (targetType) {
            case "SWAP_REQUEST", "SHIFT_SWAP_REQUEST" -> "TIMETABLE_SWAP_REQUEST";
            case "SUB_REQUEST", "EXTRA_SHIFT_REQUEST" -> "SUBSTITUTE_REQUEST";
            default -> targetType;
        };
    }

    private static Object column(Map<String, Object> row, String name) {
        if (row.containsKey(name)) return row.get(name);
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(name)) return entry.getValue();
        }
        return null;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static Long asLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.valueOf(value.toString());
    }

    private static boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) return bool;
        if (value instanceof Number number) return number.intValue() != 0;
        if (value instanceof byte[] bytes) return bytes.length > 0 && bytes[0] != 0;
        return Boolean.parseBoolean(asString(value));
    }

    private static LocalDateTime asDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime dateTime) return dateTime;
        if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        if (value instanceof java.util.Date date) return new Timestamp(date.getTime()).toLocalDateTime();
        String text = value.toString().replace(' ', 'T');
        int dot = text.indexOf('.');
        if (dot > 0) text = text.substring(0, dot);
        try {
            return LocalDateTime.parse(text);
        } catch (java.time.format.DateTimeParseException ex) {
            return null;
        }
    }
}
