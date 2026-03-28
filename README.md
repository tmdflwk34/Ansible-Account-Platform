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

## 주요 기능

### 계정 관리
- SSM을 통한 원격 계정 생성/삭제
- 역할 기반 권한 관리 (admin/ops/user)
- 다중 리전 지원 (us-east-1, us-west-2)

### Identity Center (SSO)
- AWS Identity Center 사용자 생성/삭제
- 통합 프로비저닝 (서버 계정 + SSO + 역할)

### GitHub 관리
- 저장소/팀/권한 관리
- 감사 로그 조회

### 모니터링
- 사용자 접속 로그
- sudo 명령어 히스토리

## 실행

```bash
cd /home/app/account-portal
docker compose -f docker-compose-fixed.yml up -d --build
```
