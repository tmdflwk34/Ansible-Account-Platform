# Ansible Account Platform

AWS 계정 관리 통합 포털 — http://203.0.113.10/

## 아키텍처

```
[Frontend (React+Vite)] → [Nginx (80/443)]
                              ├── /api/cost-monitoring → backend-cost (별도 저장소)
                              └── /api/*               → [backend-admin :5000]
                          [Redis 7 (캐시)]
                          [Ansible (계정 자동화)]
```

## 구동 서비스 (Docker Compose)

| 컨테이너 | 이미지 | 역할 |
|----------|--------|------|
| userportal-nginx | nginx:alpine | 리버스 프록시 (HTTP/HTTPS) |
| userportal-backend-admin | account-portal-backend-admin | 계정/SSO/GitHub/온보딩 API |
| userportal-redis | redis:7-alpine | 캐시 (256MB, allkeys-lru) |

## 디렉토리 구조

```
account-portal/
├── backend-admin/          # Flask API
│   ├── routes/             # accounts, auth, sso, onboarding, github, instances 등
│   ├── services/           # github_service
│   ├── data/               # mappings, 스크립트
│   └── Dockerfile
├── frontend/               # React + Vite + Tailwind
│   ├── src/pages/          # CreateAccount, Login, Onboarding, GitHubTeams 등
│   ├── src/components/     # Layout, Sidebar
│   ├── .env                # Cognito 설정
│   └── package.json
├── nginx/                  # nginx 설정 + SSL 인증서
└── docker-compose-fixed.yml

ansible/
├── regions/                # 리전별 playbook
│   ├── us-east-1/          # 계정 생성/삭제, 역할 변경, sudoers
│   └── us-west-2/          # 계정 생성/삭제, sudo 관리
├── roles/                  # identity_center, ssm
├── docker/                 # Ansible 실행 컨테이너
├── scripts/                # ssm_sudo.sh
├── ssm_automation/         # SSM 자동화 문서
├── cost_monitoring/        # 비용 에이전트 배포 (Ansible playbook)
├── check_user.yml
├── create_sso_user.yml
├── integrated_provisioning.yml
└── onboarding_provisioning.yml
```

## 환경변수

### backend-admin
| 변수 | 값 |
|------|-----|
| JWT_SECRET_KEY | 외부에서 주입하는 JWT 서명 비밀값. 필수이며 이전에 공개된 기본값은 거부 |
| AWS_DEFAULT_REGION | us-west-2 |
| SES_SENDER_EMAIL | noreply@example.com |
| SES_APPROVER_EMAIL | admin@example.com |
| SES_REGION | us-east-1 |

### frontend (.env)
| 변수 | 설명 |
|------|------|
| VITE_COGNITO_DOMAIN | Cognito 도메인 |
| VITE_COGNITO_CLIENT_ID | Cognito 클라이언트 ID |
| VITE_COGNITO_REDIRECT | 인증 콜백 URL |

## 실행

`JWT_SECRET_KEY`를 외부 비밀 저장소에서 호스트 프로세스 환경으로 공급해야 합니다.
Compose가 이를 백엔드 컨테이너에 전달합니다. 백엔드 디렉토리의 `.env` 파일에만
저장하는 방식에 의존하지 마세요. 키가 없거나 공백뿐이거나 이전에 공개된 값이면
인증 모듈을 시작하지 않습니다. 별도 Bedrock Gateway 포털 모듈을 배포한다면
같은 환경변수를 사용합니다. 서명 비밀값은 소스와 환경파일에 커밋하지 않습니다.

저장소에 공개됐던 TLS 개인키와 인증서는 사용하지 않습니다. 배포 전에 새로운
개인키와 그에 대응하는 인증서를 저장소 밖에 준비하고, 개인키 파일 권한은
`600`으로 제한합니다. 운영 환경에서는 신뢰할 수 있는 인증서를 사용하세요.
이미 배포된 서버의 인증서 교체는 별도 운영 작업입니다.

로컬 테스트용 자체 서명 인증서는 다음과 같이 새로 생성할 수 있습니다.

```bash
install -d -m 700 "$HOME/.local/share/userportal-tls"
export TLS_CERT_PATH="$HOME/.local/share/userportal-tls/server.crt"
export TLS_KEY_PATH="$HOME/.local/share/userportal-tls/server.key"
umask 077
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout "$TLS_KEY_PATH" -out "$TLS_CERT_PATH" \
  -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost'
```

운영 인증서를 사용하는 경우 `TLS_CERT_PATH`와 `TLS_KEY_PATH`에 해당 파일의
절대 경로를 지정합니다. 둘 중 하나라도 없거나 파일이 존재하지 않으면 Compose는
시작하지 않습니다. 개인키와 실제 자격 증명이 담긴 환경파일은 커밋하지 마세요.

```bash
cd /home/app/account-portal
docker compose -f docker-compose-fixed.yml config --quiet
docker compose -f docker-compose-fixed.yml up -d --build
```

---

## 포털 기능 상세 (스크린샷)

### I. 계정 관리 및 프로젝트 권한 제어

#### 01. 포털 사용자 관리

포털 사용자 리스트를 조회하고 역할/페이지 접근 권한을 확인합니다.

> _포털 사용자 관리 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 02. 포털 사용자 관리 상세

신규 사용자 추가, 비밀번호 설정, 역할(운영자/관리자 등) 및 페이지별 접근 권한을 직접 설정합니다.

> _포털 사용자 관리 상세 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 03. 통합 프로비저닝 (Onboarding)

원클릭으로 이메일·서버 계정 매핑, AWS IAM Identity Center 추가 및 앱 할당을 수행합니다. Infra Manager / Researcher IAM 그룹 자동 배치 및 Dry Run 검증을 지원합니다.

> _통합 프로비저닝 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 04. 서버 계정 생성

GPU 인스턴스별 원스톱 계정 생성. 가동 리전 및 대상 인스턴스를 선택하여 원클릭 발급합니다.

> _서버 계정 생성 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 05. 서버 계정 권한 변경

User(읽기) / Ops(운영) / Admin(전체) 역할을 다중 계정에 일괄 적용합니다.

> _서버 계정 권한 변경 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 06. 서버 계정 삭제

만료 계정을 즉각 회수하고 변동 사항을 실시간 반영합니다.

> _서버 계정 삭제 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 07. 서버 계정 프로젝트 권한

과제 영역별 인스턴스 그룹 분리 매핑 및 사용자 연동 배치 (project_05, project_06 등). 비인가 사용자의 연구망 접근을 통제합니다.

> _서버 계정 프로젝트 권한 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 08. 저장소 프로젝트 권한

프로젝트 리포지토리별 팀 바인딩, 쓰기 정책(Write) 무단 푸시 방지, 접근 통제 승인으로 소스코드 변형 이력을 추적합니다.

> _저장소 프로젝트 권한 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

---

### II. 세션 명령어 감사 및 자원 비용 통제

#### 09. 포털 작업 로그 조회

계정 추가·권한 수정 등 관리 조작을 실시간 이력으로 저장합니다. 작업 일자, 계정, 작업 유형별 필터링을 지원합니다.

> _포털 작업 로그 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 10. 포털 작업 로그 상세

조작 이력 터치 시 세부 구동 파라미터 팝업 — Ansible 결과 로그, 인스턴스 ID, 실행 상태(dry-run/실행됨) 등을 확인합니다.

> _포털 작업 로그 상세 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 11. 사용자 명령 로그 조회

EC2 터미널 세션 내 크리티컬 실행 커맨드(rm, docker 등) 전수 모니터링. 인스턴스, 계정명, 실행 날짜별 빠른 검색이 가능합니다.

> _사용자 명령 로그 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 12. 사용자 명령 로그 상세

명령어 실행 단건의 접속 소스 IP, 가상 터미널, 작업 디렉토리, 실행 결과(Exit Code)까지 감사 디테일 모달로 제공합니다.

> _사용자 명령 로그 상세 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 13. 사용자 접속 로그 조회

EC2 인프라 원격 접속 세션을 시간별 타임라인으로 감사합니다. 비승인 외부 네트워크 로그인 이상 원천 감지 및 인적 보안 책임 보장을 위한 기록입니다.

> _사용자 접속 로그 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 14. GitHub 활동 로그 조회

연구원들의 소스코드 Push/Create 행위를 대시보드에 연동 기록합니다. 비인가 저장소로의 소스 이동을 실시간 감사하고, GitHub 계정명과 연구 세션을 매핑합니다.

> _GitHub 활동 로그 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 15. GitHub 활동 로그 상세

푸시 건별 커밋 메타데이터(변형 항목, 대상 브랜치, 작업 일시)를 상세 분석 모달로 제공합니다. 코드 내 하드코딩된 API Key, 패키지 변형 등 보안 위협 커밋을 식별합니다.

> _GitHub 활동 로그 상세 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 16. GitHub 프로젝트 권한 로그 조회

Git 팀의 리포지토리 읽기/쓰기 권한 변경 이력을 전수 수집하여 비인가 사용자의 임의 권한 수정을 추적합니다.

> _GitHub 프로젝트 권한 로그 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 17. 과제별 클라우드 서버 비용 모니터링

연구 과제 단위(PRJ0000 항체, PRJ0000 LNP 등) AWS 클라우드 서버 비용 추이를 정산합니다. GPU/CPU 점유 상태와 담당자 정보를 연계하여 유휴 자원 과금을 해소합니다.

> _과제별 비용 모니터링 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 18. Bedrock 게이트웨이 사용자 관리

사용자별 월 예산 임계 상한선을 설정하고, 비정상 세션 또는 과도한 사용 시 API를 자동 비활성화합니다.

> _Bedrock 게이트웨이 사용자 관리 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_

#### 19. Bedrock 게이트웨이 사용량 상세

모델별(DeepSeek, AWS Bedrock, Nova 등) 호출 토큰 통계를 분석하고, 입출력 토큰 및 과금 비율을 산출하는 팝업을 제공합니다.

> _Bedrock 게이트웨이 사용량 상세 스크린샷: 실제 운영 데이터가 포함되어 저장소에서 제외함_
