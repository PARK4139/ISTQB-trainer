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
의사소통 cost 해소: 비즈니스 담당자(기획자), 개발자, 테스터가 같은 요구사항을 공유하여 동상이몽을 방지
# 코딩을 시작하기 전, 기획자, 개발자, 테스터가 동시적으로 모여 인수 조건(합격 기준)을 먼저 정합니다.
user story > AC|BDD 


# source freezing



# test Estimation # test 공수 추정
테스트 계획 단계에서 테스트에 투입될 노력(공수, Effort), 시간(일정), 비용, 자원을 과학적이고 논리적인 방법으로 예측하는 활동입니다.
# goal : 테스트가 언제 끝나는가? test schedule 이 나옴.
test monitoring > test estimation > test control 




# 3-Point Estimation
# goal: 예측값 (ex test 공수)
# 3점 추정, 
# 기존 3점 추정에서,  E=(O+M+P)/3 # 이 수식은 현실과 차이가 많이남.
# 최빈에 가중치로서 x4 를 부여한다. x1 , x4,  x1 로 보는것.
# 6 # 1 + 4 + 1 
# PERT 방식
# E=(O+4M+P)/6 (낙관 O, 최빈 M, 비관 P)
ex
Optimistic = 2일 # 낙관치
Most Likely = 5일 # 최빈치
Pessimistic = 8일 # 비관치
ㄴ> (2+20+8)/6=5일이 된다.
왜 x4 인가? 
Beta Distribution의 '최빈값(Mode, 가장 높은 꼭대기)'을 '평균값(Mean)'으로 변환하기 위한 수학적 상등 관계 
통계학 Beta Distribution에서 현실 세계의 확률을 계산해 보니, 가장 일어날 법한 일(M)의 확률적 무게가 양극단(O, P)보다 4배 무거웠기 때문입니다.
2. 수학적 배경: Beta Distribution의 근사치
PERT 공식은 통계학에서 비대칭적인 데이터를 다룰 때 쓰는 Beta Distribution의 평균값 공식을 단순화한 것입니다.
통계학에서 
Beta Distribution의 평균 = mu =(O+4M+P)/6 
이 공식은 확률 밀도 함수를 적분하여 중심 경향성을 도출하는 과정에서 수학적으로 증명된 값입니다. 프로젝트 관리 학자들(1950년대 PERT)이 실무자들이 어려운 통계 적분 기법을 쓰지 않고도 버튼만 눌러 계산할 수 있도록, Beta Distribution의 근사치 공식인 '4'와 '6'을 그대로 표준화하여 지금까지 전 세계적으로 사용하고 있습니다.
__________________________________________________ agile PLM
__________________________________________________ priority


# test order prioritization 우선순위화
ㄴ> Risk-based test prioritization
Risk가 높은 기능이나 모듈을 먼저, 그리고 더 많이 테스트하도록 순서를 정하는 전략
Risk 관리: 무리한 일정으로 인해 테스트를 대충 건너뛰어 결함이 발생하는 것을 방지합니다.
__________________________________________________ Risk 
테스트 서버 구축지연
ㄴ> Project Risk


ㄴ> Product Risk
__________________________________________________ test
priority, schedule, risk
ㄴ> test monitoring


# Exit Criteria
if (jira issue priority(severity) very high count == 0): 
  close_Test()
ㄴ> test control 

start_test()
ㄴ> test control 
__________________________________________________ 
Jira Advanced Roadmaps
CPM 활용
PERT 는 활용하지 않음
__________________________________________________ CPM 
# 주공정법
Critical Path 를 기반으로 만드는것
과거 task Duration 으로 similar task 에 대해
Duration ref 를 만듬
__________________________________________________ PERT
# GOAL
PERT는 Program Evaluation and Review Technique(프로젝트 평가 및 검토 기술)의 약자입니다. 1950년대 미국 해군이 잠수함 개발 프로젝트를 할 때, 
수많은 협력 업체들의 일정이 자꾸 늦어지는 문제를 해결하기 위해 만든 일정 관리 기법입니다.

# PERT 공식 
# 1950년대 미국 해군에서 만든 PERT 기법
수많은 프로젝트 지연 데이터를 모아보니 
대다수가 α=2, β=2 혹은 α=3, β=3 같은 형태의 베타 분포를 따르고 있었음.

# PERT 그래프
__________________________________________________ Beta Distribution
"시작(O)과 끝(P)이 막혀 있고, 한쪽으로 찌그러진 확률 그래프"일때, 수학적으로 통계


__________________________________________________
# Risk Priority
결제 실패와 UI 색상 오류가 동시에 있으면 
대개 결제 흐름 검증을 우선한다.



# 실제 프로젝트 일정 리스크를 방어
# 3-Point Estimation + Buffer 
만약 어떤 핵심 메뉴의 테스트 일정을 추정했더니 
아래와 같이 나왔다고 가정해 봅시다. 
낙관치(\[O\]): 2일기대치(\[M\]): 4일비관치(\[P\]): 14일 (에러가 폭발할 경우) 
① 가중 평균 계산 \[\mu =\frac{2+(4\times 4)+14}{6}=\frac{32}{6}\approx \mathbf{5.33일}\]② 표준편차(위험도) 계산 \[\sigma =\frac{14-2}{6}=\frac{12}{6}=\mathbf{2일}\]③ 95% 확률로 일정을 맞추기 위한 최종 일정 (버퍼 포함) 실무에서 가장 많이 쓰는 2\[\sigma \] 방어벽을 세웁니다. \[\text{최종 산정 일정}=\text{가중 평균}+(2\times \text{표준편차})\]\[\text{최종 산정 일정}=5.33일+(2\times 2일)=\mathbf{9.33일}\]결론: 기본적으로는 약 5.3일 걸릴 것으로 예상되지만, 리스크를 방어하기 위한 버퍼 4일을 더해, 최종 보고서에는 "9.3일이 필요하다"고 산정하는 것이 리스크 관리 관점에서 올바른 추정입니다. 





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



# 테스트 피라미드
테스트 피라미드는 많은 빠른 하위 레벨 자동 테스트를 기반으로 상대적으로 적은 고비용 상위 테스트를 구성




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
1. Pesticide Paradox
1. Tests wear out(Test 마모) # 오래된 Test는 개선이 필요할 확률이 높다. 




Shift-left : Test 관련 활동을 가능한 한 초기에 시작한다. 
(개발과 Test 일정을 병렬로 잡아서 결함을 앞서 발견한다는 의미로 두는것으로 보인다.)
기존 SDLC 에서 Test 를 앞당겨서 병렬 수행을 하는 방식.
_______________________________________ release process
# Semantic Versioning
SW 배포 및 버전 관리 표준
두 버전은 다음과 같은 의미 차이를 가집니다.

RC : s/w version for test
release : public release

0.1.0	초기 개발 (Initial Development) • 핵심 기능만 구현된 프로토타입 단계 • 버그가 많고 사양이 계속 바뀔 수 있음	내부 Test, 투자자/팀원 공유용, 클로즈베타

1.0.0 정식 출시 (Production-Ready) • 기능이 완성되고 안정성이 검증됨 • 사용자에게 바로 서비스 가능	공식 제품 출시, 시장 반응 검증, 일반 사용자 대상 배포
_______________________________________ open issue
_______________________________________ close issue

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



# Test Pyramid # 3 stage layer 
goal: 최소한의 비용으로 가장 빠르게, 소프트웨어의 품질을 높이는 것
  /  E2E test    \
 /Integration test \
/    Unit test       \ 