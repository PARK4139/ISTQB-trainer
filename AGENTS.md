# 저장소 기여 지침

## 프로젝트 구성

이 저장소는 ISTQB CTFL v4.0.1 한국어 학습 자료 모음입니다. 학습 웹과 시험 데이터는 `web/index.html`에 내장되어 있습니다. 화면은 DAY 01~06 통합 Issue 풀이·개념 복습과 DAY 07 모의고사로 구성됩니다. `content/locales.sqlite`는 UI 문구 번역 DB이고 `content/migrations/`에는 초기 스키마와 리소스가 있습니다. `scripts/`에는 리소스 조회·수정·빌드 및 로컬 웹 서버 스크립트가 있습니다. 공식 샘플 시험 A~D 160문항과 A 세트 추가 문항 26개 및 도표 이미지는 HTML에 내장되어 별도 샘플 시험 폴더 없이 동작합니다.

## 실행 및 개발 명령

Node.js 22.5 이상에서 `node scripts/locales.mjs init`으로 번역 DB를 만들고 `node scripts/build-locales.mjs`로 DB의 UI 문구를 HTML에 내장합니다. 문구 조회는 `node scripts/locales.mjs list`, 개별 수정은 `node scripts/locales.mjs set ko issue.title "새 제목"`, 일괄 SQL 수정은 `node scripts/locales.mjs sql "UPDATE locale_resource SET value=replace(value,'old','new') WHERE locale='ko'"`를 사용한 뒤 빌드합니다. `powershell -ExecutionPolicy Bypass -File .\scripts\run-web.ps1`은 생성된 HTML을 로컬에서 실행합니다. 학습 메모는 로컬 Node.js 서버를 통해 SQLite에 저장하고 `notes/study-notes.md`로 내보내 Git으로 관리합니다. 학습 상태는 브라우저 로컬 저장소에 저장됩니다. 저장 검증은 아래 테스트 명령을 사용합니다.

## 코딩 스타일 및 파일 이름

문구와 Google AI 참고 답변은 `content/locales.sqlite`의 고유 ID로 관리합니다. 최초 수집 파일 `content/google-ai-answers.json`과 이관한 원본은 보존하며, 재실행 시 원본 파일로 최신 DB를 덮어쓰지 않습니다. 편집 후 DB와 출력 파일 `content/study-content.json`, `web/index.html`을 함께 커밋합니다. 내보내기 재실행은 `node scripts/google-answers.mjs`입니다. Google 답변은 연결된 브라우저 기능으로 검색 화면을 읽어 수집하며 별도 크롤러를 추가하지 않습니다. 저장된 답변을 우선 재사용하고, 검색 출처와 수집 시각을 유지합니다. 수식 표기를 정리하면 최초 수집 텍스트도 보관합니다. Google 답변은 자체 해설 및 공식 자료와 구분합니다.

웹 전체 편집은 고급설정에서 기본 OFF로 제공하며 Ctrl+Shift+L의 메모 전용 동작을 보존합니다. 편집기 원본은 `scripts/global-editor.js`이고 `node scripts/build-global-editor.mjs`로 단일 HTML에 내장합니다. 입력은 화면에 즉시 반영하고 DB 저장·출력 생성은 분리합니다. `node scripts/test-study-store.mjs`, `node scripts/test-content-store.mjs`로 임시 복제본 기반 저장 회귀를 검증합니다. 브라우저에서는 다중 편집·한글 조합·복구·탭 재렌더링을 확인합니다.

“개념을 전혀 모르겠다”에서는 관련 강의의 개념·예시와 일반 개념용 Google 답변을 먼저 표시하고, 문제별 해설은 접어서 둡니다. 일반 개념 답변은 `appData.daily[].general`의 공유 ID(`G01`~`G28`)와 검색문을 기준으로 저장하며, 선택지를 포함한 문항별 답변과 혼용하지 않습니다.

특별한 필요가 없다면 의존성 없는 단일 HTML 파일 구성을 유지합니다. 한국어가 깨지지 않도록 UTF-8 인코딩을 사용합니다. 기존 코드에 맞춰 마크업과 스크립트는 두 칸 들여쓰기를 사용하고, JavaScript 식별자는 명확한 camelCase, CSS 클래스는 kebab-case로 작성합니다. 메모의 저장 기준은 `content/locales.sqlite`의 `study_note`이며 `notes/study-notes.md`는 Git 검토용 출력입니다. 기존 Markdown은 최초에만 이관하며 외부 수정은 충돌로 처리합니다. DB와 Markdown은 저장소에 포함합니다. 그 밖의 학습 기록 파일은 테스트 픽스처로 의도해 추가하는 경우가 아니면 저장소에 넣지 않습니다.

## 테스트 지침

상단 고급설정의 전체 문자열 치환은 `scripts/all-strings.mjs`와 `scripts/all-strings-editor.js`에서 구현합니다. 앱 실행 원본과 DB의 문자열 값에는 코드·URL·ID 제외 규칙을 적용하지 않습니다. `.ctfl-recovery/`는 치환 범위 밖의 실행 독립적인 원본 사본이며 Git에 넣지 않습니다. `node scripts/test-all-strings.mjs`로 파일·DB 혼합 치환, 충돌·실패·중단 및 PowerShell 독립 복구를 검증합니다. 실제 사용자 자료로 치환 검증을 하지 않습니다.

테스트 프레임워크나 커버리지 기준은 없습니다. 동작 변경은 최신 브라우저에서 해당 기능을 직접 확인합니다. 스타일 변경 시 좁은 화면도 점검하고, 한국어 표시와 학습 기록 저장이 정상인지 확인합니다.

## 커밋 및 풀 리퀘스트

커밋 제목은 `메모 실행 취소와 Issue 개념 설명 개선`처럼 한국어로 짧게 변경 내용을 설명합니다. 풀 리퀘스트에는 학습자에게 보이는 변경점과 수행한 수동 확인을 적고, 화면이 바뀌면 스크린샷을 첨부합니다. 자격시험 관련 사실을 변경할 때는 해당 실라버스 또는 시험 규정 자료를 근거로 밝힙니다.

## 콘텐츠 및 언어 원칙

실라버스 용어, 시험 규정, 샘플 시험 자료와 가이드 내용이 서로 일치하도록 유지합니다. 자체 연습 문제와 공식 샘플 시험 자료를 명확히 구분하고, 공식 샘플 문항을 수정할 때 출처와 버전을 표시하고, 웹에 필요한 문항·해설·시각 자료가 모두 내장되어 있는지 확인합니다. 기여자 안내와 설명은 항상 한국어로 작성합니다.
