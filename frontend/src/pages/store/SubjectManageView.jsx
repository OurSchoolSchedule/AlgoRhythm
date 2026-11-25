import { DetailHeading } from "@/components/ui/DetailPage";
import { useRef, useState } from "react";
import { createSubject } from "@/api";
import LoadError from "@/components/LoadError.jsx";
import { useCreateSubject, useDeleteSubject, useSubjects, useUpdateSubject } from "@/hooks";
import { queryKeys } from "@/hooks/queryKeys.js";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/utils/timetableGeneration.js";
import { subjectNamesFromCsv } from "@/utils/subjectCsv.js";

export default function SubjectManageView() {
  const queryClient = useQueryClient();
  const subjects = useSubjects();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const remove = useDeleteSubject();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState(false);
  const [csvPending, setCsvPending] = useState(false);

  const rows = subjects.data ?? [];

  const handleAdd = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ name: trimmed }, { onSuccess: () => setName("") });
  };

  const handleCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCsvPending(true);
    setCsvMessage("");
    setCsvError(false);
    try {
      const parsed = subjectNamesFromCsv(await file.text());
      if (parsed.error) {
        setCsvError(true);
        setCsvMessage(parsed.error);
        return;
      }
      const results = await Promise.allSettled(parsed.names.map((item) => createSubject({ name: item })));
      await queryClient.invalidateQueries({ queryKey: queryKeys.schoolCatalog.subjects() });
      const failed = results.filter((item) => item.status === "rejected").length;
      const saved = results.length - failed;
      setCsvError(failed > 0);
      setCsvMessage(`${saved}개를 저장했습니다.${failed ? ` ${failed}개는 실패했습니다.` : ""}`);
    } catch (error) {
      setCsvError(true);
      setCsvMessage(getApiErrorMessage(error, "CSV를 저장하지 못했습니다."));
    } finally {
      setCsvPending(false);
    }
  };

  return (
    <div className="detail-page subject-page">
      <DetailHeading title="과목·수업 관리" />
      <section className="detail-card" aria-labelledby="subject-register">
        <h2 id="subject-register">과목 등록</h2>
        <p className="subject-help">
          과목 이름을 등록합니다. 수업별 학급·교사 배정은 시간표 생성 단계에서 설정합니다.
        </p>
        <form onSubmit={handleAdd} className="subject-compose">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="새 과목명"
            placeholder="과목명"
            className="subject-compose-input"
          />
          <button type="submit" disabled={create.isPending || !name.trim()} className="detail-primary">
            {create.isPending ? "추가 중..." : "과목 추가"}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleCsv} style={{ display: "none" }} />
          <button type="button" disabled={csvPending} onClick={() => fileRef.current?.click()} className="subject-csv-button">
            {csvPending ? "올리는 중..." : "CSV 올리기"}
          </button>
        </form>
        {create.isError && (
          <p className="detail-error" role="alert">
            {getApiErrorMessage(create.error, "과목을 추가하지 못했습니다.")}{" "}
            <button type="button" className="history-link" onClick={() => create.reset()}>다시 시도</button>
          </p>
        )}
        {csvMessage && (
          <p role={csvError ? "alert" : "status"} className={csvError ? "detail-error" : "detail-success"}>{csvMessage}</p>
        )}
      </section>
      <section className="detail-card" aria-labelledby="subject-list">
        <h2 id="subject-list">등록된 과목{!subjects.isLoading && !subjects.isError && <small className="detail-count">{rows.length}개</small>}</h2>
        {subjects.isLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>불러오는 중...</p>}
        {subjects.isError && (
          <LoadError onRetry={() => subjects.refetch()} />
        )}
        {!subjects.isLoading && !subjects.isError && rows.length === 0 && (
          <p className="subject-help">등록된 과목이 없습니다.</p>
        )}
        {!subjects.isError && rows.map((subject) => (
          <div key={subject.id} className="subject-row list-row">
            {editingId === subject.id ? (
              <input
                aria-label="수정할 과목명"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                className="subject-compose-input"
                style={{ flex: 1, width: "auto" }}
              />
            ) : (
              <span style={{ flex: 1, color: "var(--color-text)" }}>{subject.name}</span>
            )}
            {editingId === subject.id ? (
              <button
                type="button"
                disabled={update.isPending || !editingName.trim()}
                onClick={() => update.mutate(
                  { subjectId: subject.id, payload: { name: editingName.trim() } },
                  { onSuccess: () => setEditingId(null) },
                )}
                className="detail-button"
              >저장</button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(subject.id);
                  setEditingName(subject.name ?? "");
                }}
                className="detail-button"
              >수정</button>
            )}
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(subject.id)}
              className="detail-button detail-danger"
            >삭제</button>
          </div>
        ))}
        {(update.isError || remove.isError) && (
          <p className="detail-error" role="alert">
            {getApiErrorMessage(update.error || remove.error, "과목을 바꾸지 못했습니다.")}{" "}
            <button type="button" className="history-link" onClick={() => { update.reset(); remove.reset(); }}>다시 시도</button>
          </p>
        )}
      </section>
    </div>
  );
}
