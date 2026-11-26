import { DetailHeading } from "@/components/ui/DetailPage";
import { useRef, useState } from "react";
import { createSubject } from "@/api";
import TeachingDirectory from "./TeachingDirectory";
import "./teaching-directory.css";
import { useHomeSession } from "@/hooks/useHomeSession";
import { useTermChoice } from "@/hooks/useTermChoice";
import { useCreateSubject } from "@/hooks";
import { queryKeys } from "@/hooks/queryKeys.js";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/utils/timetableGeneration.js";
import { subjectNamesFromCsv } from "@/utils/subjectCsv.js";

export default function SubjectManageView() {
  const queryClient = useQueryClient();
  const session = useHomeSession();
  const { term } = useTermChoice(session);
  const create = useCreateSubject();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState(false);
  const [csvPending, setCsvPending] = useState(false);

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
      <TeachingDirectory key={term?.termId ?? "catalog"} term={term} session={session} />
    </div>
  );
}
