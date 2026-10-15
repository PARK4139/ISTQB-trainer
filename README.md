# ISTQB CTFL 학습 트레이너

ISTQB CTFL v4.0.1 학습용 정적 웹 앱입니다. DAY 01~06 통합 Issue 풀이와 개념 복습, DAY 07 모의고사, 공식 샘플 시험을 제공합니다. 별도 프런트엔드 빌드 도구 없이 브라우저에서 실행합니다.

## 저장소 구조

```text
.
├── web/
│   └── index.html                # 웹 앱 진입점 및 학습·시험 데이터
├── run.cmd                       # Windows 더블클릭 실행
├── notes/
│   └── study-notes.md            # DB에서 내보내는 Git 검토용 학습 메모
├── content/
│   ├── google-ai-answers.json     # Issue별로 복사해 저장한 Google AI 답변
│   ├── locales.sqlite             # UI 문구·학습 메모 데이터베이스
│   └── migrations/                # 로케일 DB 스키마와 초기 리소스
├── scripts/
│   ├── locales.mjs                # 로케일 조회·수정 도구
│   ├── build-locales.mjs          # DB 문구를 HTML에 반영
│   ├── run-web.ps1                # 로컬 실행 진입점
│   └── static-server.mjs          # Node.js 정적 파일 서버
└── AGENTS.md                      # 기여 및 개발 지침
```

문제와 해설, 공식 샘플 시험 및 도표는 진입 HTML에 내장되어 단독으로 동작합니다. 학습 메모는 `run.cmd`로 실행하면 `notes/study-notes.md`에 자동 저장되어 Git 커밋에 포함할 수 있습니다. 학습 진도는 브라우저 로컬 저장소에 보관됩니다.

## 실행

Windows에서는 저장소 루트의 `run.cmd`를 더블클릭하면 브라우저와 로컬 서버가 실행됩니다. 서버 창을 열어 둔 채 사용하고, 종료할 때는 해당 창에서 Ctrl+C를 누르세요. 터미널에서는 다음 명령으로도 실행할 수 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-web.ps1
```

Node.js가 로컬 서버로 사용되며 `web/` 폴더를 제공합니다. 기본 주소는 `http://localhost:8000/`입니다. `web/index.html`을 직접 열면 메모는 브라우저에만 저장됩니다. 파일 자동 저장에는 `run.cmd` 실행이 필요합니다. 로케일 도구는 Node.js 22.5 이상이 필요합니다.

## 학습 메모 저장과 커밋

메모 입력을 멈추면 약 0.4초 후 SQLite에 저장하고 `notes/study-notes.md`로 내보냅니다. 메모 패널의 “DB 저장됨”을 확인한 뒤 DB와 Markdown을 함께 커밋하세요. 최초 실행 시 기존 Markdown을 원문 그대로 가져오며, 재실행으로 최신 DB를 덮어쓰지 않습니다. Markdown이 외부에서 수정되면 충돌을 알리고 양쪽 내용을 보존합니다. Git 커밋은 자동 실행되지 않습니다.

처음 실행할 때 파일이 비어 있으면 기존 브라우저 메모를 파일로 옮깁니다. 파일에 이미 메모가 있으면 해당 내용을 불러오며, 다른 브라우저 메모는 백업하고 “브라우저 메모 복원” 버튼으로 복원할 수 있습니다. 다른 창이나 편집기에서 파일이 바뀌면 덮어쓰기를 중단하고 충돌을 표시합니다. 새로고침으로 파일을 불러온 후 필요한 내용을 반영하세요.

메모에서 `Ctrl+D`를 처음 누르면 커서가 있는 단어를 선택하고, 반복해서 누르면 다음 같은 텍스트를 선택 영역에 추가합니다. `Ctrl+Shift+L`은 선택한 텍스트와 같은 모든 항목을 한 번에 선택합니다. 선택이 없으면 커서가 있는 단어를 기준으로 선택합니다. 선택한 모든 위치에서 입력·삭제·붙여넣기를 동시에 할 수 있습니다. `Esc`는 다중 선택을 해제하고, `Ctrl+Z` / `Ctrl+Y`는 편집을 실행 취소하거나 다시 실행합니다.

메모 편집에는 [CodeMirror 5.65.19](https://github.com/codemirror/codemirror5/tree/5.65.19)를 사용합니다. 오프라인에서도 단일 HTML로 실행되도록 코드와 스타일을 내장했으며 MIT 라이선스 원문도 HTML에 포함되어 있습니다.

## 웹 전체 문구 편집

메모 패널 아래 **고급설정 → 웹 전체 문구 편집**을 켜면, 메모나 페이지에서 문구를 선택하고 `Ctrl+Shift+L`로 숨겨진 탭까지 같은 문구를 찾을 수 있습니다. 기본값은 OFF이며, OFF에서는 기존 메모 안의 다중 선택을 유지합니다.

편집창에 입력하면 모든 대상이 즉시 바뀝니다. 미리보기·적용 버튼은 없습니다. 정확한 문자열·대소문자 일치로 대상을 고정하며, 코드·ID·출처 URL·UI 치환자는 제외합니다. `Ctrl+Z`/`Ctrl+Y`는 전체 대상에 함께 적용됩니다. Esc로 편집을 종료합니다. 저장 실패 시 초안을 보관한 뒤 재접속해 복구할 수 있습니다.

저장은 입력을 멈춘 뒤 약 400ms 후 DB 트랜잭션으로 처리합니다. HTML·Git용 JSON 생성은 별도 작업 스레드에서 진행하므로 DB 저장 응답이 HTML 빌드를 기다리지 않습니다. 상태의 **DB 저장됨**과 **내보내기 완료**를 구분해 확인하세요. 고급설정의 **문구 변경 이력**에서 이전 변경 묶음을 복원할 수 있으며, 다른 창의 변경과 충돌하면 덮어쓰지 않습니다.

`content/locales.sqlite`가 메모와 문구의 저장 기준입니다. `content/study-content.json`과 `notes/study-notes.md`는 Git에서 내용을 비교하는 출력이고, `web/index.html`은 오프라인 배포본입니다. 공식 샘플과 Google 답변의 원문·출처는 DB에 보존하며 수정본이 있으면 화면에 표시합니다. 최초 이관 자료는 이후 DB를 덮어쓰는 입력으로 재사용하지 않습니다.

편집기 코드를 수정하면 `node scripts/build-global-editor.mjs`로 HTML에 내장합니다. 기존 번역 CLI에서 수정한 문구는 `node scripts/build-locales.mjs`로 갱신합니다. DB의 현재 콘텐츠를 다시 내보내려면 `node scripts/google-answers.mjs`를 실행합니다. 출력 파일의 외부 변경이 감지되면 보존하고 충돌을 알립니다. 자동 Git 커밋이나 push는 하지 않습니다.

검증 명령: `node scripts/test-study-store.mjs`, `node scripts/test-content-store.mjs`. 사용자 자료를 수정하지 않고 임시 복제본에서 실행합니다.

## Google AI 참고 답변 사용

Issue 해설 아래의 “Google에서 질문 검색” 링크로 검색한 후, Google의 AI 답변을 복사해 “Google 답변 추가”에 붙여넣고 저장합니다. 저장한 답변은 `Google AI:` 아래에 표시됩니다. “답변 수정”에서 내용을 수정하거나 삭제할 수 있습니다.

“개념을 전혀 모르겠다”를 선택하면 관련 용어·원리·쉬운 예시와 `Google AI: 기본 개념`을 먼저 보여줍니다. 해당 문항의 해설은 접힌 상태로 두며 필요할 때 펼칠 수 있습니다. A~D 답안을 선택한 경우에는 기존 문항별 해설과 Google 문제 풀이를 표시합니다. 기본 개념 답변은 `G01`~`G28`로 별도 저장하며 같은 개념을 묻는 Issue끼리 공유합니다.

답변은 SQLite에 저장되며 `content/study-content.json`과 `web/index.html`에 내보냅니다. DB와 출력 파일을 함께 커밋하세요. 기존 `content/google-ai-answers.json`은 최초 수집 원본으로 보존하며, 직접 수정해도 이미 이관한 DB를 덮어쓰지 않습니다. 다음 실행부터 저장된 답변을 재사용하고 화면이 열려 있는 동안에는 5초마다 변경을 확인합니다. HTML을 직접 열어도 내장된 답변을 볼 수 있습니다. 추가·수정·삭제에는 `run.cmd` 실행이 필요합니다.

Google 답변 수집은 Codex의 연결된 브라우저 기능으로 Google 검색 화면을 직접 읽는 방식입니다. 별도 크롤러, 검색 API 키, 브라우저 자동화 패키지를 사용하지 않습니다. 브라우저로 수집한 답변에는 검색 출처와 수집 시각을 기록하며, 저장된 Issue는 재검색하지 않고 재사용합니다. 수식의 표시 형식을 정리한 경우 최초 수집 텍스트도 함께 보관합니다. 기본 해설과 다른 정답 표기가 감지되면 해당 답변에 안내를 표시합니다.

브라우저 수집은 Codex 작업 세션에서 수행합니다. `run.cmd`만 실행했을 때는 저장된 답변을 불러오며, Codex의 브라우저 기능을 자동 호출하지 않습니다. 새 문항의 답변이 필요하면 브라우저 수집 작업을 요청하세요.

미수집 Issue는 `node scripts/google-answers.mjs pending`으로 조회합니다. 기본 개념 답변만 조회하려면 `--general`, 자체 모의고사와 기본 개념까지 모두 포함하려면 `--all`을 덧붙입니다.

JSON 파일을 직접 수정한 경우 `node scripts/google-answers.mjs`로 HTML에 반영할 수 있습니다. 로컬 서버를 시작할 때도 자동으로 반영합니다. 문항 본문이 변경된 경우 이전 문항에 붙인 답변은 표시하지 않습니다. Google 답변은 사용자가 복사한 참고 자료이며 기존 해설과 구분합니다.

## 문구 수정

```sh
node scripts/locales.mjs list
node scripts/locales.mjs set ko issue.title "새 제목"
node scripts/build-locales.mjs
```

일괄 변경은 `scripts/locales.mjs sql`로 DB에 적용한 뒤 빌드합니다. 생성된 HTML의 내장 로케일 JSON을 직접 편집하지 마세요. 자동 테스트는 없으므로 변경 후 Issue 풀이, 시험 채점, 메모 저장, 한국어 표시를 브라우저에서 확인합니다.
