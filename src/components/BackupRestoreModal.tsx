/**
 * Booky STEP 08: 로컬 데이터 백업 및 복원 모달
 * 
 * - 현재 학습 기록, 표현 노트, 독서 진도를 JSON 파일로 백업
 * - 백업 파일 검증, 미리보기, 안전 덮어쓰기 복원
 * - 복원 직전 자동 롤백 스냅샷 생성 및 원클릭 롤백 복원 지원
 */

import React, { useState, useRef } from 'react';
import { BackupValidationResult } from '../types';
import {
  createLocalBackup,
  downloadBackupFile,
  validateBackupFileContent,
  restoreLocalBackup,
  rollbackPreRestoreBackup,
  hasRollbackSnapshot,
} from '../utils/backupRestore';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [canRollback, setCanRollback] = useState<boolean>(hasRollbackSnapshot());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1. 현재 데이터 백업 다운로드
  const handleDownloadBackup = () => {
    try {
      const backup = createLocalBackup();
      downloadBackupFile(backup);
      setStatusMessage({
        type: 'success',
        text: '백업 파일이 성공적으로 다운로드되었습니다. 안전한 폴더에 보관해주세요.',
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `백업 다운로드 중 오류가 발생했습니다: ${e?.message || '알 수 없는 오류'}`,
      });
    }
  };

  // 2. 파일 선택 및 검증
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateBackupFileContent(content);
      setValidationResult(result);
      if (!result.isValid) {
        setStatusMessage({
          type: 'error',
          text: result.error || '유효하지 않은 백업 파일입니다.',
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: '백업 파일이 검증되었습니다. 아래 항목들을 확인 후 [복원 적용하기]를 눌러주세요.',
        });
      }
    };
    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: '파일을 읽는 도중 오류가 발생했습니다.',
      });
    };
    reader.readAsText(file);
  };

  // 3. 복원 실행
  const handleApplyRestore = () => {
    if (!validationResult || !validationResult.isValid || !validationResult.backupData) {
      return;
    }

    if (!window.confirm('현재 브라우저에 저장된 학습 데이터가 백업 파일 내용으로 대체됩니다. 계속 진행하시겠습니까? (복원 직전 상태는 자동 백업되어 되돌릴 수 있습니다.)')) {
      return;
    }

    const res = restoreLocalBackup(validationResult.backupData);
    if (res.success) {
      setCanRollback(true);
      setStatusMessage({
        type: 'success',
        text: '성공적으로 복원되었습니다! 모든 학습 기록과 표현 노트가 최신 상태로 갱신되었습니다.',
      });
      setValidationResult(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRestoreSuccess();
    } else {
      setStatusMessage({
        type: 'error',
        text: `복원 실패: ${res.error}`,
      });
    }
  };

  // 4. 롤백 실행
  const handleRollback = () => {
    if (!window.confirm('직전 복원 이전 상태로 데이터를 되돌리시겠습니까?')) {
      return;
    }

    const res = rollbackPreRestoreBackup();
    if (res.success) {
      setCanRollback(false);
      setStatusMessage({
        type: 'success',
        text: '복원 이전의 원래 상태로 성공적으로 되돌렸습니다.',
      });
      onRestoreSuccess();
    } else {
      setStatusMessage({
        type: 'error',
        text: `되돌리기 실패: ${res.error}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="backup-modal-title"
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xl">
              💾
            </span>
            <div>
              <h2 id="backup-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                로컬 데이터 백업 및 복원
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                나만의 독서 진도, 표현 노트, 일일 통계를 파일로 안전하게 보관하거나 복원하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            aria-label="백업 모달 닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 상태 알림 메시지 */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="ml-2 font-bold opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. 데이터 백업 섹션 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2 flex items-center space-x-1.5">
              <span>📥 백업 파일 다운로드 (내보내기)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              현재 브라우저에 저장된 <strong>저장된 표현, 일일 학습 로그, 독서 진도, 단어 메모, 일일 학습 목표</strong>를 단일 JSON 파일로 내려받습니다. 외부 서버로 전송되지 않으며 파일은 본인 컴퓨터에만 저장됩니다.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition inline-flex items-center space-x-2"
            >
              <span>📥 지금 백업 다운로드 (.json)</span>
            </button>
          </div>

          {/* 2. 데이터 복원 섹션 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 flex items-center space-x-1.5">
                <span>📤 백업 파일 복원 (불러오기)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                이전에 내려받은 <code>booky-local-backup-*.json</code> 파일을 선택하여 데이터를 복원합니다.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200"
              />
            </div>

            {/* 검증 결과 미리보기 패널 */}
            {validationResult && validationResult.isValid && validationResult.backupData && (
              <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    ✓ 올바른 Booky 백업 파일입니다 ({selectedFileName})
                  </span>
                  <span className="text-slate-400">
                    생성일시: {new Date(validationResult.backupData.exportedAt).toLocaleString('ko-KR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">저장된 표현</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                      {validationResult.itemCounts?.expressions || 0}개
                    </strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">학습 로그</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                      {validationResult.itemCounts?.dailyLogs || 0}건
                    </strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">단어 메모</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                      {validationResult.itemCounts?.vocabNotes || 0}개
                    </strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">CNN 뉴스 기사</span>
                    <strong className="text-rose-600 dark:text-rose-400 text-sm">
                      {validationResult.itemCounts?.cnnNewsArticles || 0}건
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={handleApplyRestore}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    이 데이터로 복원 적용하기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. 직전 복원 되돌리기 (롤백 지원) */}
          {canRollback && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  ↩️ 직전 복원 이전 상태로 되돌리기 (롤백 가능)
                </h4>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  가장 최근 복원을 실행하기 직전의 데이터 스냅샷이 안전하게 보관되어 있습니다.
                </p>
              </div>
              <button
                onClick={handleRollback}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg shadow-sm transition shrink-0"
              >
                원래 상태로 되돌리기
              </button>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>🛡️ 복원 직전 상태는 자동 백업되어 안전합니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
