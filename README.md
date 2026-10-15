# ISTQB CTFL 학습 트레이너

ISTQB CTFL v4.0.1 학습용 정적 웹 앱입니다. DAY 01~06 통합 Issue 풀이와 개념 복습, DAY 07 모의고사, 공식 샘플 시험을 제공합니다. 별도 프런트엔드 빌드 도구 없이 브라우저에서 실행합니다.

## 저장소 구조

```text
.
├── istqb_ctfl_7day_learning.html  # 웹 앱 진입점 및 학습·시험 데이터
├── content/
│   ├── locales.sqlite             # UI 문구 데이터베이스
│   └── migrations/                # 로케일 DB 스키마와 초기 리소스
├── scripts/
│   ├── locales.mjs                # 로케일 조회·수정 도구
│   ├── build-locales.mjs          # DB 문구를 HTML에 반영
│   ├── run-web.ps1                # 로컬 실행 진입점
│   └── static-server.mjs          # Node.js 정적 파일 서버
├── ISTQB_Exam-Structures-and-Rules_v1.2.pdf
└── AGENTS.md                      # 기여 및 개발 지침
```

문제와 해설, 공식 샘플 시험 및 도표는 진입 HTML에 내장되어 단독으로 동작합니다. 메모와 학습 진도는 브라우저 로컬 저장소에 보관됩니다.

## 실행

Windows에서는 저장소 루트에서 다음을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-web.ps1
```

Python 3 또는 Node.js가 로컬 서버로 사용되며 기본 주소는 `http://localhost:8000/istqb_ctfl_7day_learning.html`입니다. 로케일 도구는 Node.js 22.5 이상이 필요합니다.

## 문구 수정

```sh
node scripts/locales.mjs list
node scripts/locales.mjs set ko issue.title "새 제목"
node scripts/build-locales.mjs
```

일괄 변경은 `scripts/locales.mjs sql`로 DB에 적용한 뒤 빌드합니다. 생성된 HTML의 내장 로케일 JSON을 직접 편집하지 마세요. 자동 테스트는 없으므로 변경 후 Issue 풀이, 시험 채점, 메모 저장, 한국어 표시를 브라우저에서 확인합니다.
