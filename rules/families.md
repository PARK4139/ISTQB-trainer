# 기능 분류

이 독립 저장소의 Issue 소유 범위는 ISTQB 학습 웹이다. 외부 pk_system 제품의 Issue 큐에 등록하지 않는다.

| function family | meaning | implementation location |
|---|---|---|
| persistence | 학습 메모·콘텐츠 저장, 이관, 내보내기와 저장 무결성 | content/, notes/, scripts/ |
| editing | 고급설정, 웹 전체 문구 검색·편집·실행 취소와 복구 | web/index.html, scripts/ |
| diagnostics | 편집 및 저장 성능 측정과 회귀 검증 | scripts/, 외부 검증 증거 |
| process | Issue 등록·실행 절차와 도구 환경 사건 기록 | issues/, rules/ |
