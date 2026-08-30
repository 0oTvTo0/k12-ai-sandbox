// 批注栏：AI 老师对代码的批注（WPS 审阅式），与编辑器双向联动（FR-07）
// 每条批注：编号圆标（颜色随严重度）+ 起止行 + 文字；点击定位代码行
const SEV = {
  error: { color: "#ff4d6a", label: "错误" },
  warn: { color: "#ffb020", label: "注意" },
  tip: { color: "#3b82f6", label: "小建议" },
};

export default function AnnotationPanel({ annotations, activeId, onFocus, onAccept, onAcceptAll, onClose }) {
  if (!annotations?.length) return null;

  return (
    <div className="border-t border-(--hairline) bg-(--glass-bg) max-h-56 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-(--hairline)">
        <span className="text-xs font-extrabold text-main">📝 小码老师的批注</span>
        <span className="chip">{annotations.length}</span>
        <div className="flex-1" />
        <button onClick={onAcceptAll} className="text-[10px] text-accent hover:underline font-bold">
          全部采纳
        </button>
        <button onClick={onClose} className="text-[10px] text-faint hover:text-main font-bold">
          ✕
        </button>
      </div>

      <div className="overflow-y-auto p-1.5 space-y-1">
        {annotations.map((a, i) => {
          const sev = SEV[a.severity] || SEV.error;
          return (
            <div
              key={a.id}
              className={`flex items-start gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-all ${
                activeId === a.id ? "glass ring-1 ring-(--accent)" : "hover-tint"
              }`}
              onClick={() => onFocus?.(a.id)}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 mt-0.5"
                style={{ background: sev.color }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold" style={{ color: sev.color }}>
                    {sev.label}
                  </span>
                  <span className="text-[10px] text-faint font-mono">
                    {a.start_line}{a.end_line > a.start_line ? `-${a.end_line}` : ""} 行
                  </span>
                </div>
                <p className="text-xs text-main leading-snug mt-0.5">{a.text}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAccept?.(a.id); }}
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold text-(--ok) hover:bg-(--ok)/10"
                title="我改好了"
              >
                ✓ 改好
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
