package com.rssolplan.edu.global.exception;

import com.rssolplan.edu.domain.auth.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 400 Bad Request - 잘못된 시간 범위 등
    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Object> handleBadRequest(BadRequestException ex) {
        return ApiResponse.error("BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Object> handleRequestBinding(Exception ex) {
        return ApiResponse.error("BAD_REQUEST", ex.getMessage());
    }

    // 401 Unauthorized - JWT 토큰 문제
    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Object> handleUnauthorized(UnauthorizedException ex) {
        return ApiResponse.error("UNAUTHORIZED", ex.getMessage());
    }

    //403 Forbidden , 인가실패
    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Object> handleForbidden(ForbiddenException ex) {
        return ApiResponse.error("FORBIDDEN", ex.getMessage());
    }

    // 404 Not founded, 리소스 찾을 수 없음.
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Object> handleNotFound(NotFoundException ex) {
        return ApiResponse.error("NOT_FOUND", ex.getMessage());
    }

    // fallback
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Object> handleGeneralException(Exception ex) {
        log.error("Unhandled exception", ex);
        return ApiResponse.error("INTERNAL_ERROR", ex.getMessage());
    }
}
