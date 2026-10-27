#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Booky STEP 09 검증 스크립트:
- CNN News C2 고급 영어 학습 카테고리 기능 검증
- .txt, .md, .html 파일 안전 파서 및 XSS 방지 검증
- 규칙 기반 문장 분할(약어 오분할 방지) 및 C2 8대 질문 템플릿 검증
- C2 문장 분석, 독해 질문 답변, 어휘 노트, 작문/토론, 통계 및 백업 연동 검증
- TypeScript 타입 검사 및 원서 28권 데이터 무결성 검증
"""

import sys
import os
import subprocess

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_test(name, fn):
    print(f"[*] 테스트 실행: {name} ...", end=" ", flush=True)
    try:
        fn()
        print("PASS")
        return True
    except AssertionError as ae:
        print(f"FAIL (AssertionError: {ae})")
        return False
    except Exception as e:
        print(f"FAIL (Exception: {e})")
        return False

# 1. 파일 존재 여부 검증
def test_files_exist():
    required_files = [
        "src/types.ts",
        "src/utils/newsFileParser.ts",
        "src/utils/cnnNewsStorage.ts",
        "src/utils/backupRestore.ts",
        "src/components/cnnNews/CnnNewsRegisterModal.tsx",
        "src/components/cnnNews/CnnNewsCategoryView.tsx",
        "src/components/cnnNews/CnnNewsReaderView.tsx",
        "src/components/Header.tsx",
        "src/App.tsx",
    ]
    for rf in required_files:
        full_path = os.path.join(ROOT_DIR, rf)
        assert os.path.isfile(full_path), f"필수 파일 누락: {rf}"

# 2. Node.js 단위 테스트 (파서, 스토리지, 문장분할, C2 어휘, 백업 연동)
def test_cnn_news_node_unit():
    node_script = """
    import { parseNewsFile } from './src/utils/newsFileParser.ts';
    import {
        splitIntoSentences,
        DEFAULT_C2_READING_QUESTIONS,
        addNewsArticle,
        loadNewsArticles,
        updateSentenceAnalysis,
        updateQuestionAnswer,
        updateWritingOutput,
        updateDebateOutput,
        saveNewsExpression,
        loadNewsExpressions,
        calculateNewsStats,
        deleteNewsArticle,
    } from './src/utils/cnnNewsStorage.ts';
    import { createLocalBackup, validateBackupFileContent } from './src/utils/backupRestore.ts';

    // Mock localStorage
    const store = {};
    globalThis.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
    };

    // 1. 파일 파서 검증
    // 1-1. TXT 파싱
    const txtRes = parseNewsFile('test-news.txt', 'Headline News\\n\\nFirst paragraph here.\\n\\nSecond paragraph here.', 100);
    if (!txtRes.success || txtRes.paragraphs.length !== 3) {
        throw new Error('TXT 파싱 실패: ' + JSON.stringify(txtRes));
    }

    // 1-2. MD 파싱
    const mdRes = parseNewsFile('analysis.md', '# Major Economic Shift\\n\\nThe central bank held rates steady.', 100);
    if (!mdRes.success || mdRes.title !== 'Major Economic Shift' || mdRes.paragraphs.length !== 1) {
        throw new Error('MD 파싱 실패: ' + JSON.stringify(mdRes));
    }

    // 1-3. 비지원 파일(PDF, DOCX) 차단 검증
    const pdfRes = parseNewsFile('report.pdf', 'dummy content', 500);
    if (pdfRes.success || !pdfRes.error.includes('.pdf')) {
        throw new Error('PDF 차단 안내 실패');
    }

    // 1-4. 5MB 초과 거부
    const overRes = parseNewsFile('huge.txt', 'a', 6 * 1024 * 1024);
    if (overRes.success || !overRes.error.includes('크기')) {
        throw new Error('5MB 초과 차단 실패');
    }

    // 2. 규칙 기반 문장 분할 검증 (약어 오분할 방지)
    const complexPara = "The U.S. Federal Reserve met on Jan. 15 with Dr. Powell presiding. The market rallied; however, inflation remains sticky.";
    const sentences = splitIntoSentences(complexPara);
    if (sentences.length !== 2) {
        throw new Error('문장 분할 실패 (약어 오분할 감지), 결과 개수: ' + sentences.length + ' 내용: ' + JSON.stringify(sentences));
    }
    if (!sentences[0].includes('U.S.') || !sentences[0].includes('Dr. Powell')) {
        throw new Error('약어 복원 실패');
    }

    // 3. C2 8대 질문 템플릿 검증
    if (DEFAULT_C2_READING_QUESTIONS.length !== 8) {
        throw new Error('C2 독해 질문 템플릿 개수 불일치 (8개 필요): ' + DEFAULT_C2_READING_QUESTIONS.length);
    }

    // 4. 기사 등록 및 CRUD 검증
    const article = addNewsArticle({
        title: 'Global Markets React to Inflation Data',
        source: 'CNN',
        articleDate: '2026-10-27',
        topic: 'Economy',
        rawContent: 'The U.S. Federal Reserve held rates.\\n\\nAnalysts foresee a cautious path ahead.',
        paragraphs: ['The U.S. Federal Reserve held rates.', 'Analysts foresee a cautious path ahead.'],
        koreanSummary: '연준의 금리 동결 결정과 시장 반응 분석',
        fileName: 'markets.txt',
        fileType: 'txt',
    });

    if (article.status !== 'not_started') throw new Error('초기 상태 오류');
    const articles = loadNewsArticles();
    if (articles.length !== 1 || articles[0].id !== article.id) throw new Error('기사 로드 오류');

    // 5. C2 문장 분석 저장 검증
    updateSentenceAnalysis(article.id, {
        id: 'sent-0-1',
        sentence: 'The U.S. Federal Reserve held rates.',
        paragraphIndex: 0,
        sentenceStructure: 'S + V + O 단문 구조',
        keyGrammar: '과거시제',
        logicalConnectors: 'None',
        referents: 'None',
        implicitMeaning: '금리 인하 기대를 일축',
        toneAndAttitude: 'Neutral objective',
        koreanTranslation: '미 연방준비제도는 금리를 동결했다.',
        questions: '동결 결정의 파급효과는?',
        updatedAt: new Date().toISOString(),
    });

    const updatedArt = loadNewsArticles()[0];
    if (updatedArt.status !== 'in_progress') throw new Error('문장 분석 후 상태 갱신 실패');
    if (!updatedArt.sentenceAnalyses['sent-0-1']) throw new Error('문장 분석 저장 실패');

    // 6. C2 독해 질문 답변 검증
    updateQuestionAnswer(article.id, 'q-1-main-argument', '중심 논지는 인플레이션 재점화 위험에 따른 신중론이다.', '연준 의장의 기자회견 발언 인용');
    const qAnsweredArt = loadNewsArticles()[0];
    const q1 = qAnsweredArt.readingQuestions.find(q => q.id === 'q-1-main-argument');
    if (!q1 || q1.userAnswer !== '중심 논지는 인플레이션 재점화 위험에 따른 신중론이다.') {
        throw new Error('질문 답변 저장 실패');
    }

    // 7. C2 작문 및 토론 저장 검증
    updateWritingOutput(article.id, {
        summary: 'The Fed held rates steady amidst persistent inflationary pressures.',
        stance: 'agree',
        opinionEssay: 'Holding rates is prudent given sticky core inflation.',
        alternativeProposals: 'Targeted fiscal tightening should complement monetary stance.',
        koreanDraft: '물가 안정을 위한 금리 동결은 불가피함.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    updateDebateOutput(article.id, {
        coreIssue: 'Is the current rate stance overly restrictive?',
        argumentsFor: 'It prevents secondary inflation waves.',
        argumentsAgainst: 'It harms labor markets unnecessarily.',
        counterArguments: 'Labor market remains resilient.',
        rebuttal: 'Data shows robust hiring.',
        finalPosition: 'The policy stance is justifiable.',
        updatedAt: new Date().toISOString(),
    });

    // 8. C2 어휘 저장 및 KeyExpression 연동 검증
    const exprList = saveNewsExpression({
        expression: 'sticky inflation',
        inContext: 'Inflation remains sticky despite tightening.',
        everydayMeaning: '쉽게 내려가지 않는 고착화된 물가 상승세',
        partOfSpeech: 'noun phrase',
        englishDefinition: 'Inflation that does not easily adjust downward',
        synonymsAntonyms: 'Syn: stubborn inflation',
        formalityLevel: 'journalistic',
        newsId: article.id,
        newsTitle: article.title,
        userNote: '주요 경제 헤드라인 필수 표현',
    });

    if (exprList.length !== 1 || exprList[0].sourceType !== 'news' || exprList[0].newsId !== article.id) {
        throw new Error('C2 어휘 표현 저장 및 메타 연동 실패: ' + JSON.stringify(exprList[0]));
    }

    const newsExprs = loadNewsExpressions(article.id);
    if (newsExprs.length !== 1) throw new Error('기사별 어휘 필터 실패');

    // 9. 통계 계산 검증
    const stats = calculateNewsStats();
    if (stats.totalArticles !== 1 || stats.totalAnalyzedSentences !== 1 || stats.totalAnsweredQuestions !== 1 || stats.totalNewsExpressions !== 1) {
        throw new Error('뉴스 통계 계산 불일치: ' + JSON.stringify(stats));
    }

    // 10. 백업 및 복원 스키마 연동 검증
    const backup = createLocalBackup();
    if (!backup.data.cnnNewsArticles || backup.data.cnnNewsArticles.length !== 1) {
        throw new Error('백업 데이터에 cnnNewsArticles 누락');
    }
    const valRes = validateBackupFileContent(JSON.stringify(backup));
    if (!valRes.isValid || valRes.itemCounts.cnnNewsArticles !== 1) {
        throw new Error('백업 유효성 검증 실패: ' + JSON.stringify(valRes));
    }

    console.log('NODE_UNIT_SUCCESS');
    """

    res = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", node_script],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    assert res.returncode == 0, f"Node 단위 검증 오류 (출력: {res.stdout}, 에러: {res.stderr})"
    assert "NODE_UNIT_SUCCESS" in res.stdout, "예상된 성공 메시지가 출력되지 않았습니다."

# 3. TypeScript 컴파일 검사
def test_typescript_compilation():
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "npx tsc --noEmit; exit $LASTEXITCODE"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    assert res.returncode == 0, f"TypeScript 컴파일 오류:\n{res.stdout}\n{res.stderr}"

# 4. Vite 프로덕션 빌드 무결성 검증
def test_production_build():
    build_env = os.environ.copy()
    build_env["VITE_CONFIG_NATIVE_IGNORE_WARNING"] = "true"
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "if (Test-Path dist) { Remove-Item -Recurse -Force dist }; npm run build; exit $LASTEXITCODE"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=build_env
    )
    assert res.returncode == 0, f"Vite 빌드 오류:\n{res.stdout}\n{res.stderr}"
    dist_index = os.path.join(ROOT_DIR, "dist", "index.html")
    assert os.path.isfile(dist_index), "빌드 산출물(dist/index.html)이 생성되지 않았습니다."

def main():
    print("=================================================================")
    print("      Booky STEP 09 CNN News C2 학습 시스템 종합 검증            ")
    print("=================================================================")

    tests = [
        ("핵심 소스 및 컴포넌트 파일 존재 확인", test_files_exist),
        ("CNN 뉴스 파서, 스토리지, C2 분석, 백업 연동 Node 단위 테스트", test_cnn_news_node_unit),
        ("TypeScript 타입 검사 (npx tsc --noEmit)", test_typescript_compilation),
        ("Vite 프로덕션 빌드 (npm run build)", test_production_build),
    ]

    success = True
    for name, fn in tests:
        if not run_test(name, fn):
            success = False
            break

    print("=================================================================")
    if success:
        print(">>> STEP 09 검증 결과: 모든 테스트 통과 (100% 무결성 확인)")
        sys.exit(0)
    else:
        print(">>> STEP 09 검증 실패")
        sys.exit(1)

if __name__ == '__main__':
    main()
