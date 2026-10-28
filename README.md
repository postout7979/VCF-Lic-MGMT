# VCF-Lic-MGMT

VMware Cloud Foundation(VCF) 환경의 라이센스를 관리하기 위한 사내 도구입니다. 공급자(벤더)로부터 받은 라이센스 데이터, Broadcom Customer Support Portal(CSP) 데이터, 그리고 실제 운영 중인 vCenter / VCF Operations 인프라에서 수집한 실사용 현황을 하나의 "프로젝트" 단위로 모아서 비교·관리할 수 있도록 만들어졌습니다.

## 이 애플리케이션이 하는 일

라이센스 관리에서 흔히 발생하는 다음 문제를 해결하기 위한 도구입니다.

- 공급자가 보내준 라이센스 엑셀 파일과, Broadcom CSP에 등록된 라이센스 정보, 그리고 실제 vCenter/VCF Operations에서 사용 중인 코어/소켓 수가 서로 다른 곳에 흩어져 있어 한눈에 비교하기 어렵다.
- 어떤 라이센스가 어떤 프로젝트(고객사/사이트)에 할당되어 있는지 추적하기 어렵다.
- 라이센스 키 기준으로 "공급자 데이터에는 있는데 CSP에는 없다" 혹은 그 반대의 불일치를 찾아내기 어렵다.

이를 위해 백엔드(FastAPI + PostgreSQL)가 데이터를 저장·가공하고, 프론트엔드(React)가 역할 기반으로 화면을 제공합니다.

## 기술 스택

- **백엔드**: Python, FastAPI, SQLAlchemy, PostgreSQL (Alembic 마이그레이션은 아직 도입되지 않았고, 애플리케이션 시작 시 `create_all` + 수동 스키마 패치로 테이블을 맞춥니다)
- **프론트엔드**: React + Vite + TypeScript (SPA, React Router로 라우팅)
- **인프라 연동**: `pyVmomi`(vCenter API), `playwright` + `requests`(VCF Operations 로그인/수집), `openpyxl`(엑셀 업로드 파싱), `Pillow`(브랜드 이미지 처리)
- **배포**: Docker / Docker Compose (개발용 `docker-compose.yml`, 운영용 `appliance/docker/docker-compose.prod.yml`), 그리고 vSphere에 OVA로 배포하기 위한 스캐폴드(`appliance/`)

## 프로젝트 구조

```
backend/            FastAPI 앱 (모델, 스키마, API 라우터, 서비스, 테스트)
  app/api/          기능별 REST 엔드포인트
  app/models/       SQLAlchemy ORM 모델
  app/schemas/      Pydantic 요청/응답 스키마
  app/services/     엑셀 임포트, vCenter/VCF Ops 수집, 메일 발송, DB 백업 등 비즈니스 로직
  app/core/         설정, 인증, DB 세션, 입력 검증
frontend/           React + Vite + TypeScript UI
  src/pages/        화면 단위 페이지
  src/pages/admin/  설정(관리자) 화면의 탭들
  src/components/   모달, 공통 위젯
appliance/          OVA 어플라이언스 빌드 스캐폴드 (vSphere 배포용)
docker-compose.yml  개발용 db + backend + frontend 스택
```

## 핵심 기능

### 로그인 / 사용자 / 권한

- 관리자 계정(`admin`)은 아이디로 로그인하며, 설치 시 자동으로 생성됩니다(최초 비밀번호 `admin`, 반드시 변경 필요).
- 일반 사용자는 이메일 주소로 로그인하며, 가입은 "가입 신청" → **설정 > 사용자 승인** 탭에서 관리자 승인 후 계정이 생성되는 구조입니다. 승인/반려 내역은 승인 기록으로 남습니다.
- 비밀번호 찾기는 세 가지 경로를 지원합니다: (1) 이메일로 OTP 코드 발송, (2) 가입 시 등록한 보안 질문 3개로 본인 확인, (3) 관리자가 발급한 복구 키(recovery key) 사용. 이메일 발송은 **설정 > SMTP** 탭에 등록된 메일 서버를 사용합니다.
- 사용자는 하나 이상의 프로젝트에 배정될 수 있고(다대다), "공급자 현황" 메뉴는 기본적으로 관리자에게만 보이며 사용자별로 노출 여부를 켤 수 있습니다.

### 프로젝트

라이센스 데이터를 모으는 기본 단위입니다. **설정 > 프로젝트** 탭에서 프로젝트를 만들고, 아직 어떤 프로젝트에도 배정되지 않은 라이센스 항목(공급자 데이터) 중에서 골라 "할당(Assign)"합니다. 한 항목은 동시에 하나의 프로젝트에만 속할 수 있습니다. 좌측 메뉴의 "공급자 현황"에서는 프로젝트별 Perpetual / Subscription 수량(Quantity-ENT) 합계를 보여주고, 프로젝트를 클릭하면 그 프로젝트에 할당된 모든 라이센스 항목의 상세 목록으로 전환됩니다.

### 공급자 데이터 (설정 > 공급자 데이터)

공급자가 보내준 라이센스 엑셀 파일(`.xlsx`)을 업로드합니다. 헤더 이름으로 컬럼을 자동 매칭해 Serial Number, Parent Customer, Customer Name, License Key, License Type, Product Name, Quantity-ENT, Contract Status, Start/End Date, ERP Site ID, Enduser Account Name, Part Number, Division 등을 저장합니다. 같은 Serial Number로 다시 업로드하면 기존 행이 새 데이터로 갱신되며 중복 생성되지 않습니다. 업로드 배치 단위로 삭제할 수도 있습니다.

### CSP 현황 (설정 > CSP 현황 / 좌측 메뉴 "Customer Support Portal 현황")

Broadcom CSP에서 받은 라이센스 데이터를 엑셀로 업로드하고, 프로젝트에 할당·조회합니다. 업로드/삭제/검색/정렬/페이지네이션 방식은 공급자 데이터와 동일한 패턴을 따릅니다.

### Legacy Infra (설정 > Legacy Infra)

실제 운영 중인 **vCenter(7.x/8.x)** 서버에 연결 정보(호스트, 계정, TLS 검증 여부)를 등록하면, `pyVmomi`를 통해 호스트별 라이센스·하드웨어 정보를 수집합니다. 연결마다 자동 동기화 주기(분 단위)를 설정할 수 있고, 수집된 인벤토리 항목을 프로젝트에 매칭할 수 있습니다.

### VCF Infra (설정 > VCF Infra)

**VMware Cloud Foundation / VCF Operations** 환경에 연결해 코어 라이센스 사용 현황(verified core 등)을 수집합니다. 내부적으로 `playwright`로 로그인 플로우를 처리하고 `requests`로 API를 호출합니다. Legacy Infra와 마찬가지로 자동 동기화 주기, 프로젝트 매칭을 지원합니다.

### 조회 화면 (좌측 메뉴)

- **라이센스 종합 현황**: 프로젝트별 Perpetual/Subscription 수량을 도넛 차트로 요약해서 보여줍니다.
- **실시간 사용 현황**: 프로젝트를 선택해 Legacy Infra 또는 VCF Infra에서 수집한 실사용 데이터를 라이센스 타입별로 조회합니다.
- **CSP 현황**: 업로드된 CSP 라이센스 데이터를 조회합니다.
- **라이센스 키 매칭 현황**: 라이센스 키 기준으로 공급자(Legacy) 데이터와 CSP 데이터를 대조해, "양쪽에 모두 있음 / Legacy에만 있음 / CSP에만 있음" 상태와 수량 불일치를 찾아냅니다.

### 설정(관리자 전용) 탭 전체 목록

| 탭 | 내용 |
|---|---|
| 프로젝트 | 프로젝트 생성 및 라이센스 항목 할당 |
| 공급자 데이터 | 공급자 라이센스 엑셀 업로드/조회/삭제 |
| CSP 현황 | Broadcom CSP 라이센스 엑셀 업로드/조회/삭제 |
| Legacy Infra | vCenter 연결 등록 및 인벤토리 수집 |
| VCF Infra | VCF Operations 연결 등록 및 코어 라이센스 수집 |
| 사용자 | 사용자 계정 생성/수정/프로젝트 배정/메뉴 노출 설정 |
| 사용자 승인 | 가입 신청 승인/반려 및 승인 기록 조회 |
| SMTP | 비밀번호 재설정 메일 발송용 SMTP 서버 설정 및 테스트 발송 |
| Network | (어플라이언스/서버) 네트워크 설정 |
| 브랜드 | 로그인 페이지 배경 이미지, 로고, 저작권 문구 등 커스터마이징, 기본값으로 복원 |
| 백업 | 전체 데이터베이스 백업(.sql 다운로드) 및 복원(업로드) |

또한 설정 화면 상단의 **"환경 설정 초기화"** 버튼으로 admin 계정과 브랜드 이미지를 제외한 모든 데이터(업로드된 공급자/CSP 데이터, 연동된 vCenter/VCF Operations 연결과 수집 데이터, 프로젝트, 사용자 계정, 신청/승인 기록, SMTP/Network 설정)를 한 번에 초기화할 수 있습니다. 되돌릴 수 없는 작업이라 두 번의 확인을 거칩니다.

## 시작하기 (Docker, 개발 환경)

```bash
docker compose up --build
```

세 개의 컨테이너가 올라옵니다.

- `db` — PostgreSQL 16, `localhost:5432`
- `backend` — FastAPI, `http://localhost:8000` (API 문서는 `/docs`)
- `frontend` — Vite 개발 서버, `http://localhost:5173` (`/api`를 backend 컨테이너로 프록시)

백엔드는 시작 시 테이블을 자동 생성하고, 이후 추가된 컬럼들은 `main.py`의 `SCHEMA_PATCHES`(idempotent한 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 구문들)로 보정합니다. 아직 Alembic 마이그레이션은 쓰지 않습니다.

### Docker 없이 실행하기

```bash
# 데이터베이스만 Docker로
docker compose up -d db

# 백엔드
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm install
npm run dev
```

VCF Operations 수집 기능을 로컬에서 테스트하려면 Playwright 브라우저 바이너리 설치가 추가로 필요합니다(`playwright install`).

## 운영 배포 (Docker, 프로덕션)

`appliance/docker/docker-compose.prod.yml`은 개발용 Vite 서버 대신 Nginx로 서빙되는 프로덕션 프론트엔드 빌드를 사용하며, 80/443 포트만 노출합니다.

```bash
docker build -f appliance/docker/frontend/Dockerfile.prod -t frontend-prod .
docker compose -f appliance/docker/docker-compose.prod.yml up -d
```

## vSphere OVA 어플라이언스 (appliance/)

이 리포지토리는 애플리케이션 전체를 vSphere의 "Deploy OVF Template" 마법사로 배포 가능한 OVA로 패키징하기 위한 스캐폴드도 포함합니다. VCSA, NSX Manager 등 다른 VMware 어플라이언스처럼, 배포 시 호스트명/IP/서브넷/게이트웨이/DNS/NTP/root 비밀번호를 입력받아 최초 부팅 시 게스트 OS(Ubuntu Server)에 자동 적용합니다.

- `ovf/product-section.xml` — vApp Properties 정의
- `guest/ovf-customize.sh`, `ovf-customize.service` — 최초 부팅 시 속성을 읽어 netplan 네트워크 설정, NTP, hostname, root 비밀번호를 적용하는 스크립트와 systemd 유닛
- `docker/` — 운영용 Docker Compose 스택과 부팅 시 자동 기동용 systemd 유닛
- `build/` — 실제 `.ova` 파일을 조립하는 빌드 스크립트와 OVF 병합 스크립트

어플라이언스 구성요소별로 실제 검증된 부분과 아직 검증되지 않은 부분(특히 실제 vCenter/ESXi 환경에서의 배포 테스트)이 다르므로, 자세한 내용과 빌드/검증 절차는 `appliance/README.md`를 참고하세요.

## 참고 사항

- 데이터베이스 스키마는 Alembic 없이 `create_all` + 수동 `ALTER TABLE` 패치로 관리되므로, 운영 중인 DB에 새 컬럼이 필요한 변경을 할 때는 `backend/app/main.py`의 `SCHEMA_PATCHES` 목록에 멱등(idempotent)한 구문을 추가하는 방식을 따릅니다.
- VCF Operations 연동은 `playwright`(로그인 플로우)와 `requests`(API 호출)를 함께 사용하므로, 수집 기능을 쓰려면 백엔드 컨테이너에 Playwright 브라우저가 설치되어 있어야 합니다(`backend/Dockerfile` 참고).
- 사내 전용 도구이므로, 외부 공개 저장소에 올릴 경우 실제 고객사명·호스트·인증정보 등이 커밋에 포함되지 않도록 주의가 필요합니다.
