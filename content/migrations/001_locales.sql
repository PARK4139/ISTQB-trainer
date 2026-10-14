PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS locale_metadata (
  locale TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl'))
);

CREATE TABLE IF NOT EXISTS locale_resource (
  locale TEXT NOT NULL REFERENCES locale_metadata(locale) ON DELETE CASCADE,
  resource_key TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (locale, resource_key)
);

CREATE INDEX IF NOT EXISTS locale_resource_by_locale
  ON locale_resource(locale, resource_key);

INSERT INTO locale_metadata(locale, display_name, direction)
VALUES ('ko', '한국어', 'ltr')
ON CONFLICT(locale) DO NOTHING;

INSERT INTO locale_resource(locale, resource_key, value, context) VALUES
  ('ko', 'nav.integratedDays', 'DAY 01–06', '통합 학습 영역 표시'),
  ('ko', 'nav.finalDay', 'DAY 07', '최종 학습 영역 표시'),
  ('ko', 'nav.issuePractice', 'Issue 풀이', '기본 탭 이름'),
  ('ko', 'nav.concepts', '개념·해설', '학습 개념 탭 이름'),
  ('ko', 'nav.mockExam', '실전 모의고사', '모의고사 탭 이름'),
  ('ko', 'nav.officialExam', '공식 샘플 시험', '공식 시험 탭 이름'),
  ('ko', 'nav.wrongNotes', '오답노트', '오답 복습 탭 이름'),
  ('ko', 'nav.roadmap', '전체 로드맵', '학습 계획 탭 이름'),
  ('ko', 'issue.title', 'DAY 01–06 · 통합 Issue 풀이', '통합 연습 화면 제목'),
  ('ko', 'issue.intro', 'Issue를 풀고 답을 확인한 뒤 관련 개념을 복습합니다.', '통합 연습 화면 설명'),
  ('ko', 'issue.scoreLabel', '{count} Issues · 목표 80%', '통합 연습 점수 라벨'),
  ('ko', 'issue.answerStatus', '응답 현황', '통합 연습 응답 수 라벨'),
  ('ko', 'issue.badge', 'Issue {number}', '연습 항목 번호'),
  ('ko', 'issue.dayChapter', 'DAY {day} · Chapter {chapter}', '연습 항목의 날짜와 장'),
  ('ko', 'issue.reset', 'Issue 답안 초기화', '연습 답안 초기화 버튼'),
  ('ko', 'issue.resetConfirm', '통합 Issue 답안을 모두 초기화할까요?', '초기화 확인 메시지'),
  ('ko', 'issue.reviewConcepts', '개념·해설 보기 →', '개념 복습 버튼'),
  ('ko', 'feedback.correct', '정답 · 선택이 정확합니다', '정답 피드백 제목'),
  ('ko', 'feedback.wrong', '오답 · 내 선택 {selected} · 정답 {right}', '오답 피드백 제목'),
  ('ko', 'lesson.title', 'DAY 01–06 · 통합 개념', '통합 개념 화면 제목'),
  ('ko', 'lesson.intro', 'Issue 풀이 후 필요한 개념과 해설을 복습합니다.', '통합 개념 화면 설명'),
  ('ko', 'lesson.search', '통합 개념 검색', '통합 개념 검색 입력'),
  ('ko', 'lesson.reviewIssues', 'Issue 풀이로 돌아가기 →', 'Issue 풀이 이동 버튼'),
  ('ko', 'lesson.section', 'DAY {day} · {title}', '강의 묶음 제목'),
  ('ko', 'lesson.goal', '학습 목표', '강의 항목 목표 라벨'),
  ('ko', 'lesson.keyPoints', '반드시 기억할 핵심', '강의 핵심 라벨'),
  ('ko', 'lesson.example', '실무 적용 예시', '강의 사례 라벨'),
  ('ko', 'lesson.examTrap', '시험 함정', '강의 주의사항 라벨'),
  ('ko', 'lesson.done', '학습 완료', '완료 상태'),
  ('ko', 'lesson.pending', '학습 대기', '대기 상태'),
  ('ko', 'lesson.markDone', '이 개념 학습 완료', '강의 완료 체크 문구'),
  ('ko', 'lesson.markDoneHint', '내용 이해 후 학습 완료 체크', '강의 완료 체크 안내'),
  ('ko', 'lesson.noResults', '검색 결과가 없습니다. 다른 키워드를 입력해 보세요.', '통합 개념 검색 결과 없음')
ON CONFLICT(locale, resource_key) DO NOTHING;
