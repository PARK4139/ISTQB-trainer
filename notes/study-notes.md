# SDLC
# SW Dev Life Cycle


# R&R 
# SQA Team|SW DEV Team
SQA: 요구사항 Analysis 및 Test Design # Configuration, Condition, State
ㄴ> Test Basis # Test 근거
SW 테스팅에서 TC를 분석, 설계, 개발하기 위한 근거와 기초가 되는 모든 문서와 정보를 의미합니다. 
즉, "어떤 기준으로 Test를 만들었는가"에 대한 원천 자료
ㄴ> AC  # Acceptance Criteria # 인수 기준 
user story > AC|BDD 



# ATDD (Acceptance Test-Driven Development)
# goal : common Acceptance Criteria
의사소통의 갭 해소: 비즈니스 담당자(기획자), 개발자, 테스터가 같은 요구사항을 공유하여 동상이몽을 방지
# 코딩을 시작하기 전, 기획자, 개발자, 테스터가 동시적으로 모여 인수 조건(합격 기준)을 먼저 정합니다.
user story > AC|BDD 



# Exit Criteria
if (jira issue priority(severity) very high count == 0): 
  Test 종료()


# Risk-based test prioritization?
리스크(Risk)가 높은 기능이나 모듈을 먼저, 그리고 더 많이 테스트하도록 순서를 정하는 전략


# test Estimation # test 공수 추정
테스트 계획 단계에서 테스트에 투입될 노력(공수, Effort), 시간(일정), 비용, 자원을 과학적이고 논리적인 방법으로 예측하는 활동입니다.
# goal : 테스트가 언제 끝나는가? test schedule 이 나옴.



# Three-Point Estimation
# 가중 3점 추정?
# E=(a+4m+b)/6 (낙관 a, 최빈 m, 비관 b)
ex
낙관 2일, 최빈 5일, 비관 8일이면 (2+20+8)/6=5일이 된다. 
결제 실패와 UI 색상 오류가 동시에 있으면 
대개 결제 흐름 검증을 우선한다.




# transition coverage 100%
기존TC전이수 = 4  # A→B, A→C, B→C, C→A
전이모든수 = 3 * 3  =  9  # 모든 경우의 수
자기자신전이 = 3 # Error Case 이를 TC에 포함시킬수도 있고 제외할수도 있다. 
전이모든수 - 자기자신전이 = 9 - 3 = 6 
전체_coverage = 전이모든수 - 자기자신전이 / 전이모든수 - 자기자신전이 
기존TC유효_coverage = 4/6 * 100 
전체_coverage_% = 100
부족_coverage_% = 25



# statement coverage 100%
logic 의 모든구문이 필요해 보인다. 이건 white box test 아닌가? 



# 분기 coverage 100%
logic tree 



SQA: 정적 Test Activity (Runtime 이 아닌 상황에서 할수 있는 Test로 보인다 맞나?
ㄴ> API의 응답 스키마 리뷰
Exploratory Review 
ㄴ> 설계 문서 리뷰







Exploratory test ( 탐색적 시험) 은 동시성이 중요. runtime test 만 포함.
ㄴ> Dynamic Testing
동적 Test Activity
API Test
SQA: Test 준비 (Auto) 
SQA: Test 실행
SQA: Test 결과 평가
SQA: open issue 
DEV: Debugging 
DEV: 결함 수정 
SQA: Verification: 명세와 산출물이 일치하는가?
SQA: Validation: 이해관계자의 실제 요구와 필요를 충족하는가?
SQA: Confirmation Test(확인시험): 발견된 결함이 수정되었는가?
DEV: close issue 



이해관계자의 실제 필요에 적합



Root Cause > Human Error > Defect > Failure > SQA Team& Dev Team




Test 7원칙
Tests wear out(Test 마모) # 오래된 Test는 개선이 필요할 확률이 높다. 



Shift-left : Test 관련 활동을 가능한 한 초기에 시작한다. 
(개발과 Test 일정을 병렬로 잡아서 결함을 앞서 발견한다는 의미로 두는것으로 보인다.)
기존 SDLC 에서 Test 를 앞당겨서 병렬 수행을 하는 방식.





_______________________________________ release process
# Semantic Versioning
SW 배포 및 버전 관리 표준
두 버전은 다음과 같은 의미 차이를 가집니다.

RC : s/w version for test
release : public release


버전	의미	추천 상황
1.0 (또는 1.0.0)	정식 출시 (Production-Ready) • 기능이 완성되고 안정성이 검증됨 • 사용자에게 바로 서비스 가능	공식 제품 출시, 시장 반응 검증, 일반 사용자 대상 배포
0.1 (또는 0.1.0)	초기 개발 (Initial Development) • 핵심 기능만 구현된 프로토타입 단계 • 버그가 많고 사양이 계속 바뀔 수 있음	내부 Test, 투자자/팀원 공유용, 클로즈베타
_______________________________________ TBD
EP(Equivalence Partitioning, 동등 분할): 입력 영역을 동등한 그룹으로 나누어 대표값을 선정한다.



# BVA
# Boundary Value Analysis # 경계값 분석
# 경계값, 인접값을 집중적으로 Test한다.


test basis: feature
test basis: 요구사항 : 허용 나이가 18~65세(int)
ㄴ> black box test design
ㄴ> Test Combination
ㄴ> bounday 17
ㄴ> 2-value BVA # 효율적으로 빠르게 해야할떄
ㄴ> 동등분할
ㄴ> {하한미만} 17
ㄴ> {유효구간} 30
ㄴ> {상한초과} 66
ㄴ> 3-value BVA # 조금더 신중하게 해야할떄



feature function adding (신규 기능 추가)
ㄴ> Feature Test
ㄴ> Verification + Functional Testing 
ㄴ> Verification


fixing function editing (기존 기능 수정)
ㄴ> Verification + Regression Testing



결함 수정	Confirmation Testing + 필요 시 Regression Testing
요구사항·설계 변경	Verification
정식 Release	릴리스 승인 기준 확인 + 필요한 Test