package com.rssolplan.edu.domain.notification.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponseDto {

    private Long id;
    private String storeName;
    private String profileImageUrl;

    private String category;
    private String type;
    private String message;

    private LocalDateTime createdAt;

    private String targetType;
    private Long targetId;

    // ===== 요청 ID =====
    private Long shiftSwapRequestId;
    private Long extraShiftRequestId;

    // ===== 상태 (프론트 버튼 제어용) =====
    private String shiftSwapStatus;
    private String shiftSwapManagerApprovalStatus;
    private String extraShiftStatus;

    private boolean isRead;
}
