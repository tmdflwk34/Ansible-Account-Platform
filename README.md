# Ansible Account Platform

AWS 계정 관리 자동화 — Identity Center, SSM, Ansible 기반 멀티 리전 사용자 프로비저닝

## 구조

```
ansible/
├── regions/
│   ├── template_region/        # 리전 템플릿
│   ├── us-east-1/              # 버지니아
│   │   ├── playbooks/          # create_account, delete_account, update_role, user_remove
│   │   ├── automation/         # admin/ops/user 자동화 JSON + b64
│   │   ├── files/sudoers/      # acme-admin, acme-ops, acme-user
│   │   └── group_vars/         # region.yml
│   └── us-west-2/              # 오레곤
│       ├── playbooks/          # create/delete_account, grant/revoke_sudo, set/update_role
│       ├── files/sudoers/
│       └── group_vars/
├── roles/
│   ├── identity_center/tasks/  # create_user, delete_user (AWS Identity Center)
│   └── ssm/tasks/              # grant_sudo (SSM Run Command)
├── docker/                     # Ansible 실행 컨테이너 (Dockerfile + entrypoint)
├── scripts/                    # ssm_sudo.sh
├── ssm_automation/
│   ├── documents/              # SSM Automation 문서 (create_user, remove_user, change_role)
│   └── scripts/                # SSM 문서 업로드 스크립트
├── cost_monitoring/            # 비용 모니터링 에이전트 배포
│   ├── files/agent/            # Docker 에이전트 (agent.py, Dockerfile)
│   ├── files/config/           # mapping.json
│   ├── infrastructure/         # Athena DDL, Terraform, IAM 정책
│   ├── lambda/                 # cost_monitoring_lambda.py
│   ├── storage_tracker/bin/    # s3_ebs_tracker.py
│   ├── deploy.sh               # 배포 스크립트
│   └── deploy_agent.yml        # Ansible 배포 playbook
├── check_user.yml              # 사용자 존재 확인
├── create_sso_user.yml         # SSO 사용자 생성
├── integrated_provisioning.yml # 통합 프로비저닝 (계정+SSO+역할)
├── onboarding_provisioning.yml # 온보딩 프로비저닝
└── audit_logs.json             # 감사 로그
```

## 주요 기능

### 계정 관리
- 리전별 서버 계정 생성/삭제 (SSM Run Command)
- 역할 기반 권한: `admin` / `ops` / `user`
- sudoers 파일 자동 배포

### Identity Center (SSO)
- AWS Identity Center 사용자 생성/삭제
- 통합 프로비저닝 (서버 계정 + SSO + 역할 한번에)

### SSM Automation
- `create_user`: 사용자 생성 자동화 문서
- `remove_user`: 사용자 삭제 자동화 문서
- `change_role`: 역할 변경 자동화 문서

### 비용 모니터링 에이전트 배포
- GPU/CPU 인스턴스에 Docker 에이전트 배포
- 60초 주기 메트릭 수집 → S3 업로드

## 실행

```bash
# Ansible 컨테이너에서 실행
cd /home/app/ansible
ansible-playbook regions/us-west-2/playbooks/create_account.yml -e "username=<user> role=<role>"
```

## 지원 리전
- `us-east-1` (버지니아)
- `us-west-2` (오레곤)
