import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Type
} from 'lucide-react';
import type { Quiz, QuizQuestion } from '../../types/electron.d.ts';
import { api } from '../../services/api';

interface QuizRunnerProps {
  lessonId: string;
  onQuizCompleted?: (score: number, passed: boolean) => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  lessonId,
  onQuizCompleted
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scorePercentage, setScorePercentage] = useState(0);
  const [passed, setPassed] = useState(false);
  const [hmacSignature, setHmacSignature] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);

  // On load: apply Fisher-Yates shuffle to OPTIONS within each question
  useEffect(() => {
    api.getQuizByLessonId(lessonId).then((fetchedQuiz) => {
      if (fetchedQuiz) {
        setQuiz(fetchedQuiz);
        let qs = fetchedQuiz.questions || [];

        if (fetchedQuiz.shuffle_questions) {
          qs = qs.map((q) => {
            const opts = [...(q.options || [])];
            const correctText = opts[q.correct_index ?? 0]; // Save the correct answer TEXT

            // Fisher-Yates shuffle
            for (let i = opts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [opts[i], opts[j]] = [opts[j], opts[i]];
            }

            const newCorrectIndex = opts.indexOf(correctText); // Find new position after shuffle
            return { ...q, options: opts, correct_index: newCorrectIndex >= 0 ? newCorrectIndex : 0 };
          });
        }

        setQuestions(qs);
        setTimeLeftSeconds((fetchedQuiz.time_limit_minutes || 15) * 60);
      }
    });
  }, [lessonId]);

  // Countdown timer
  useEffect(() => {
    if (isSubmitted || timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeftSeconds]);

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: optionIndex
    }));
  };

  const handleFillAnswerChange = (text: string) => {
    if (isSubmitted) return;
    setFillAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: text
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitted || !quiz) return;

    let correctCount = 0;
    const totalPossible = questions.length || 1;

    questions.forEach((q, idx) => {
      if (q.question_type === 'fill_blank') {
        const studentText = (fillAnswers[idx] || '').trim().toLowerCase();
        const targetText = (q.correct_answer_text || '').trim().toLowerCase();
        if (studentText && targetText && (studentText === targetText || targetText.includes(studentText))) {
          correctCount++;
        }
      } else {
        const selected = selectedAnswers[idx];
        if (selected !== undefined && selected === (q.correct_index ?? 0)) {
          correctCount++; // Compare against ACTUAL correct index (not always 0)
        }
      }
    });

    const calculatedScore = totalPossible > 0 ? Math.round((correctCount / totalPossible) * 100) : 100;
    const hasPassed = calculatedScore >= (quiz.passing_score || 80);

    setScorePercentage(calculatedScore);
    setPassed(hasPassed);
    setIsSubmitted(true);

    const answersPayload = JSON.stringify({
      mcq: selectedAnswers,
      fill: fillAnswers,
      score: calculatedScore
    });

    try {
      const result = await api.saveQuizAttempt(quiz.id, calculatedScore, hasPassed, answersPayload);
      setHmacSignature(result.hmac_signature);
      if (onQuizCompleted) {
        onQuizCompleted(calculatedScore, hasPassed);
      }
    } catch (err) {
      console.error('Error saving quiz attempt:', err);
    }
  };

  const handleRetake = () => {
    setIsSubmitted(false);
    setSelectedAnswers({});
    setFillAnswers({});
    setCurrentQuestionIdx(0);
    setHmacSignature(null);
    setTimeLeftSeconds((quiz?.time_limit_minutes || 15) * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!quiz) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading assessment questions...
      </div>
    );
  }

  const currentQ = questions[currentQuestionIdx];
  const isFillQuestion = currentQ?.question_type === 'fill_blank';

  return (
    <div className="space-y-6">
      {/* Assessment Header Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full">
              ASSESSMENT RUNNER
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Passing Mark: {quiz.passing_score}%</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 font-poppins">{quiz.title}</h3>
        </div>

        {/* Timer */}
        {!isSubmitted && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-mono font-bold text-slate-700">
            <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>
        )}
      </div>

      {/* Main Runner Stage */}
      {!isSubmitted ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          {/* Progress Ribbon */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
            <span className="font-mono font-bold text-slate-700">
              Question {currentQuestionIdx + 1} of {questions.length}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {isFillQuestion ? 'Fill in the Blank' : 'Multiple Choice'}
            </span>
          </div>

          {/* Question Prompt */}
          <div className="space-y-3">
            <h4 className="text-base font-bold text-slate-900 leading-relaxed font-poppins">
              {currentQ?.prompt}
            </h4>
          </div>

          {/* Interactive Input: Fill-in or MCQ */}
          {isFillQuestion ? (
            <div className="space-y-2 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <Type className="w-4 h-4 text-orange-600" />
                <span>Enter exact technical parameter or answer word:</span>
              </div>
              <input
                type="text"
                value={fillAnswers[currentQuestionIdx] || ''}
                onChange={(e) => handleFillAnswerChange(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-3">
              {currentQ?.options?.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`p-4 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold shadow-sm ring-1 ring-orange-300'
                        : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="text-xs font-medium flex-1">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Step Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx((p) => Math.min(questions.length - 1, p + 1))}
                className="px-5 py-2.5 rounded-full btn-brand-gradient text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-orange-500/20"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results & Explanations Card */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-3 pb-6 border-b border-slate-100">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg ${
                passed
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/15'
                  : 'bg-red-50 text-red-600 border border-red-200 shadow-red-500/15'
              }`}
            >
              {passed ? <Sparkles className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  passed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {passed ? 'Assessment Passed' : 'Assessment Failed'}
              </span>
              <h3 className="text-3xl font-black text-slate-900 mt-2 font-poppins">
                {scorePercentage}%
              </h3>
              <p className="text-xs text-slate-500">
                {passed
                  ? `Congratulations! You scored above the required ${quiz.passing_score}% benchmark.`
                  : `You scored below the ${quiz.passing_score}% threshold. Review the solutions and retake.`}
              </p>
            </div>

            {hmacSignature && (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-mono text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>HMAC Sign: {hmacSignature.slice(0, 16)}...</span>
              </div>
            )}
          </div>

          {/* Solutions & Instructor Explanations Review */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Solutions & Engineering Rationales
            </h4>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isFill = q.question_type === 'fill_blank';
                let isCorrect = false;

                if (isFill) {
                  const studentText = (fillAnswers[idx] || '').trim().toLowerCase();
                  const targetText = (q.correct_answer_text || '').trim().toLowerCase();
                  isCorrect = Boolean(studentText && targetText && (studentText === targetText || targetText.includes(studentText)));
                } else {
                  isCorrect = selectedAnswers[idx] === (q.correct_index ?? 0);
                }

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Q{idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">{q.prompt}</h5>
                      </div>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </div>

                    <div className="text-[11px] space-y-0.5 pt-1">
                      {isFill ? (
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-slate-500">Your Answer: "{fillAnswers[idx] || '—'}"</span>
                          <span className="text-emerald-700 font-bold">| Target: "{q.correct_answer_text}"</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-slate-500">
                            Your Selection: {selectedAnswers[idx] !== undefined ? String.fromCharCode(65 + selectedAnswers[idx]) : 'None'}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            | Correct: {String.fromCharCode(65 + (q.correct_index ?? 0))} ({q.options?.[q.correct_index ?? 0]})
                          </span>
                        </div>
                      )}
                      {q.explanation && (
                        <div className="p-2.5 bg-white/80 rounded-xl border border-slate-100 text-xs text-slate-700 font-sans mt-2">
                          <span className="font-bold text-slate-900">Technical Rationale: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Retake CTA */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleRetake}
              className="px-6 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-2 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Assessment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
