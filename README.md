<div align="center">

<br/>

# AlgoRhythm
### AI 기반 인력 운영 최적화를 위한 지능형 스케줄링 및 시프트 관리 웹 플랫폼

<br/>

[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Dev_Server-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-Backend-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![MySQL](https://img.shields.io/badge/MySQL-DB-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Deploy-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![OpenAI](https://img.shields.io/badge/OpenAI-LLM_API-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![Claude](https://img.shields.io/badge/Claude-LLM_API-111111?style=flat-square&logo=anthropic&logoColor=white)](https://www.anthropic.com)

<br/>

> **2026 이화여자대학교 캡스톤디자인과창업프로젝트**
> **Team 알고리듬**

<br/>

</div>

---

## 📌 Overview

기존 스케줄링 시스템은 AI 기반 최적화 기능이 적용되지 않은 단순 알고리즘 구조로 운영되는 경우가 많아, 개인 선호도·업무 부담을 충분히 반영하기 어렵습니다.  
또한 관리자가 엑셀/수기로 스케줄을 2차 조정하는 과정에서 행정 리소스가 낭비되고, 단순 순번/가나다순 배정은 불균형과 편향을 유발할 수 있습니다.

AlgoRhythm은 국내 시장에 부재한 **지능형 자동 스케줄링** 시스템을 구축하여, 데이터 기반의 공정한 배정과 운영 효율 향상을 목표로 합니다.

**타겟:** 교사, 특히 교무처장 등 학교 스케줄 관리 인력

<br/>

## ✨ Key Features

- **AI 지능형 자동 스케줄링**: 근무자 정보와 필수 제약 조건을 학습하여 최적의 시간표 자동 생성
- **시간표 대안 제시**: 단일안이 아닌 복수의 최적화 대안을 생성해 선택권 제공
- **인터랙티브 캘린더 관리**: 통합 캘린더 조회 및 드래그 앤 드롭 등 직관적 수정/관리
- **긴급 대타 매칭 및 시프트 교환**: 결원 발생 시 가용 인원 데이터 분석을 통해 최적 대리 근무자 추천/연결

<br/>

## 🧩 확장 가능성

- 교내 시간표 및 감독 배정 최적화 (타겟: 교사)

<br/>

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                 Frontend (React + Vite / Vercel)              │
│   인터랙티브 캘린더 UI · 시간표 확인/수정 · 보결/교환 요청 UX       │
└──────────────────────────────┬────────────────────────────────┘
                               │  HTTPS REST API
┌──────────────────────────────▼────────────────────────────────┐
│                Backend (Spring Boot + JPA REST API)           │
│   스케줄/인력 데이터 API · 승인 프로세스 · 실시간 상태 관리(예정)     │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
      ┌────────▼────────┐              ┌───────▼────────┐
      │   MySQL (RDS)    │              │ Redis (Cache)  │
      │ 인력/스케줄 데이터  │              │ 실시간 상태 캐싱   │
      └──────────────────┘              └────────────────┘
                               │
                 ┌─────────────▼─────────────┐
                 │ AI/Optimization + LLM API  │
                 │ 하드 제약조건 기반 생성/대안 │
                 │ 자연어 제약조건 파싱/매칭추천 │
                 └───────────────────────────┘
```

<br/>

## 🛠️ Tech Stack

- **Frontend**: React, Vite, 인터랙티브 캘린더 UI, (배포) Vercel
- **Backend**: Spring Boot, JPA 기반 REST API
- **AI/Optimization**: 하드 제약조건 보장 알고리즘 기반 시간표 자동 생성 및 대안 제공
- **LLM API**: OpenAI, Claude (자연어 기반 제약조건 추출 및 결원 발생 시 최적 매칭 추천)
- **DB**: MySQL (인력/스케줄 데이터)
- **Cache**: Redis (실시간 상태 캐싱)
- **Deploy/Infra**: AWS EC2 + RDS, Docker, GitHub Actions 기반 CI/CD

<br/>

## ▶️ 실행 방법

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd ../backend
./gradlew test
./gradlew bootRun
```

<br/>

## ✅ 현재 완성도

- **구현 완료**:
  - 시간표 자동 생성
  - 캘린더 기반 수정
- **진행 중**:
  - 자연어 기반 요구사항 입력(LLM 파싱) → 제약조건 자동 설정
  - 결원/보결/교환 요청 등 실시간 변수 통합 관리(라이브 학사 관리)
  - 관리자 승인 프로세스 고도화
- **미구현/예정**:
  - MVP 고도화 및 배포 환경 이중화(유지보수 효율을 위한 전략)

<br/>

## 👥 Team

- 2376273 조상은 (PM)
- 2466044 이시은 (BE, AI)
- 2416023 정지유 (Design, FE)

<br/>

## 📁 Repository Structure


```text
algorhythm/
├── backend/
├── docs/
└── frontend/
```

<br/>

## 🔒 보안/민감정보

- API Key, DB 비밀번호, 토큰 등 민감정보는 Repo에 포함하지 않습니다.
