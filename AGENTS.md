# 저장소 기여 지침

## 프로젝트 구성

이 저장소는 ISTQB CTFL v4.0.1 한국어 학습 자료 모음입니다. 학습 웹과 시험 데이터는 `web/index.html`에 내장되어 있습니다. 화면은 DAY 01~06 통합 Issue 풀이·개념 복습과 DAY 07 모의고사로 구성됩니다. `content/locales.sqlite`는 UI 문구 번역 DB이고 `content/migrations/`에는 초기 스키마와 리소스가 있습니다. `scripts/`에는 리소스 조회·수정·빌드 및 로컬 웹 서버 스크립트가 있습니다. 공식 샘플 시험 A~D 160문항과 A 세트 추가 문항 26개 및 도표 이미지는 HTML에 내장되어 별도 샘플 시험 폴더 없이 동작합니다.

## 실행 및 개발 명령

Node.js 22.5 이상에서 `node scripts/locales.mjs init`으로 번역 DB를 만들고 `node scripts/build-locales.mjs`로 DB의 UI 문구를 HTML에 내장합니다. 문구 조회는 `node scripts/locales.mjs list`, 개별 수정은 `node scripts/locales.mjs set ko issue.title "새 제목"`, 일괄 SQL 수정은 `node scripts/locales.mjs sql "UPDATE locale_resource SET value=replace(value,'old','new') WHERE locale='ko'"`를 사용한 뒤 빌드합니다. `powershell -ExecutionPolicy Bypass -File .\scripts\run-web.ps1`은 생성된 HTML을 로컬에서 실행합니다. 학습 메모는 로컬 Node.js 서버를 통해 notes/study-notes.md에 자동 저장하며 Git으로 관리합니다. 학습 상태는 브라우저 로컬 저장소에 저장됩니다. 자동화된 테스트 명령은 없습니다.

## 코딩 스타일 및 파일 이름

특별한 필요가 없다면 의존성 없는 단일 HTML 파일 구성을 유지합니다. 한국어가 깨지지 않도록 UTF-8 인코딩을 사용합니다. 기존 코드에 맞춰 마크업과 스크립트는 두 칸 들여쓰기를 사용하고, JavaScript 식별자는 명확한 camelCase, CSS 클래스는 kebab-case로 작성합니다. 학습 메모 파일 notes/study-notes.md는 저장소에 포함합니다. 그 밖의 학습 기록 파일은 테스트 픽스처로 의도해 추가하는 경우가 아니면 저장소에 넣지 않습니다.

## 테스트 지침

테스트 프레임워크나 커버리지 기준은 없습니다. 동작 변경은 최신 브라우저에서 해당 기능을 직접 확인합니다. 스타일 변경 시 좁은 화면도 점검하고, 한국어 표시와 학습 기록 저장이 정상인지 확인합니다.

## 커밋 및 풀 리퀘스트

커밋 제목은 `메모 실행 취소와 Issue 개념 설명 개선`처럼 한국어로 짧게 변경 내용을 설명합니다. 풀 리퀘스트에는 학습자에게 보이는 변경점과 수행한 수동 확인을 적고, 화면이 바뀌면 스크린샷을 첨부합니다. 자격시험 관련 사실을 변경할 때는 해당 실라버스 또는 시험 규정 자료를 근거로 밝힙니다.

## 콘텐츠 및 언어 원칙

실라버스 용어, 시험 규정, 샘플 시험 자료와 가이드 내용이 서로 일치하도록 유지합니다. 자체 연습 문제와 공식 샘플 시험 자료를 명확히 구분하고, 공식 샘플 문항을 수정할 때 출처와 버전을 표시하고, 웹에 필요한 문항·해설·시각 자료가 모두 내장되어 있는지 확인합니다. 기여자 안내와 설명은 항상 한국어로 작성합니다.
