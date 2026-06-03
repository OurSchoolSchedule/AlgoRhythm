# AlgoRhythm — Backend

> AlgoRhythm 스케줄링 플랫폼의 REST API 서버. 인력/스케줄 도메인 로직, 다중 제약조건 검증, 인증·인가를 담당합니다.
> 상위 프로젝트 소개는 [루트 README](../README.md)를 참고하세요.

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-007396?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Gradle](https://img.shields.io/badge/Gradle-Build-02303A?style=flat-square&logo=gradle&logoColor=white)](https://gradle.org)

---

## 🧩 주요 책임 (Responsibilities)

- **인증 / 인가**: Spring Security + **JWT** 기반 인증, **Kakao 소셜 로그인**(OAuth) 연동
- **이메일 인증**: Google **SMTP(JavaMailSender)** 로 인증 코드 발송 + **Redis TTL** 기반 코드 검증/만료 관리
- **스케줄·인력 도메인**: 근무자/스케줄 데이터 관리 및 다중 제약조건 검증 비즈니스 로직
- **API 문서화**: Springdoc(OpenAPI) 명세 제공 (정적 분리 배포: [Swagger UI](https://ourschoolschedule.github.io/AlgoRhythm-swagger/))
- **헬스 체크**: Spring Boot Actuator (`/actuator/health`)

> ℹ️ **자연어 제약조건 파싱(OpenAI API)** 은 루트 README의 *Future Scope* 항목으로, 현재 백엔드에는 연동 예정 상태입니다.

---

## 🛠️ Tech Stack

| 영역 | 사용 기술 |
|---|---|
| Framework | Spring Boot 3.5.5 (Java 17, Gradle) |
| Persistence | Spring Data JPA, MySQL (`mysql-connector-j`) |
| Cache | Spring Data Redis |
| Security | Spring Security, JWT (`jjwt 0.11.5`) |
| Mail | Spring Boot Starter Mail (Google SMTP), Thymeleaf(메일 템플릿) |
| API Docs | springdoc-openapi 2.8.9 |
| Config | spring-dotenv (`.env` 지원), spring-boot-starter-validation |
| Util | Lombok, org.json |
| Test | JUnit5, Spring Boot Test, Spring Security Test |

---

## ▶️ Getting Started

```bash
# 사전 요구: Java 17, 로컬 MySQL · Redis (또는 원격 인스턴스)

cd backend

# 의존성 설치 및 빌드 + 테스트
./gradlew build

# 테스트만 실행
./gradlew test

# 애플리케이션 실행 (기본 http://localhost:8080)
./gradlew bootRun
```

### Docker로 실행

```bash
# backend/Dockerfile (멀티 스테이지: gradle:8.7-jdk17 빌드 → eclipse-temurin:17 실행)
docker build -t algorhythm-backend ./backend
docker run -p 8080:8080 --env-file ./backend/.env algorhythm-backend
```

---

## 🔑 환경 변수 (Environment Variables)

민감정보는 모두 환경변수로 주입하며 저장소에 커밋하지 않습니다. (`application.yml`은 `${ENV}` 플레이스홀더만 포함)

| 변수 | 설명 |
|---|---|
| `PORT` | 서버 포트 (기본 8080) |
| `SPRING_DATASOURCE_URL` | MySQL 접속 URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | MySQL 계정 |
| `REDISHOST` / `REDISPORT` / `REDISPASSWORD` | Redis 접속 정보 |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Google SMTP 계정 (앱 비밀번호) |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` / `KAKAO_REDIRECT_URI` | Kakao OAuth 설정 |
| `JWT_SECRET` | JWT 서명 키 (운영 시 반드시 교체) |

---

## 📚 API 문서

- **Swagger UI (정적 배포)**: https://ourschoolschedule.github.io/AlgoRhythm-swagger/
- 무료 호스팅의 OOM을 피하기 위해 애플리케이션에 Swagger UI를 포함하지 않고 OpenAPI JSON만 추출하여 GitHub Pages로 분리 배포합니다.

---

## 🚀 배포 (Deployment)

- **현재**: Railway 무료 요금제에 한시적 배포 (`https://edu.rssolplan.com`). 무료 정책상 **SMTP 발송이 제한**되어 배포 환경에서 이메일 인증이 정상 동작하지 않을 수 있습니다.
- **예정 (2025년 7~8월 이후)**: MVP 고도화와 함께 **AWS(EC2/ECR)** 환경으로 이전. CI/CD는 `.github/workflows/deploy.yml`(Docker 이미지 빌드 → ECR push)로 구성되어 있습니다.

---

## 🗂️ 구조 (관례적 레이어)

```text
backend/
├── src/main/java/com/example/...   # config · controller · service · repository · domain · dto
├── src/main/resources/
│   └── application.yml             # 환경변수 플레이스홀더 기반 설정
├── src/test/java/...               # 도메인/보안 테스트
├── build.gradle
├── settings.gradle
└── Dockerfile
```