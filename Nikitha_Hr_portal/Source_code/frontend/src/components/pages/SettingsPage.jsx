import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import toast from "react-hot-toast";
import "../../styles.css";
import API from "../../services/api";

function useScrollLock() {
  const scrollRef = useRef(null);
  const lockScroll = () => {
    const scroller = document.querySelector(".main-content") || window;
    const y = scroller === window ? window.scrollY : scroller.scrollTop;
    scrollRef.current = { scroller, y };
  };
  useLayoutEffect(() => {
    if (scrollRef.current === null) return;
    const { scroller, y } = scrollRef.current;
    if (scroller === window) window.scrollTo({ top: y, behavior: "instant" });
    else scroller.scrollTop = y;
    scrollRef.current = null;
  });
  return lockScroll;
}

function TipPopover({ rows, docxOnly = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="tip-anchor" ref={ref}>
      <button
        type="button"
        className={`tip-btn sp-tip-btn${open ? " tip-btn--active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Show placeholders"
      >
        <span className="tip-btn-label">Placeholders</span>
      </button>
      {open && (
        <div className="tip-popover">
          <div className="tip-popover-arrow" />
          <p className="tip-popover-heading">
            {docxOnly ? "Use in your .docx template" : "Use in subject or body"}
          </p>
          <table className="tip-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Meaning</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ placeholder, label, example }) => (
                <tr key={placeholder} className={placeholder === "issue_date" ? "tip-row-auto" : ""}>
                  <td><code className="tip-chip">{`{${placeholder}}`}</code></td>
                  <td className="tip-col-label">{label}</td>
                  <td className="tip-col-example">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionGroup({ id, title, subtitle, children }) {
  return (
    <section className="sp-group" id={id}>
      <div className="sp-group-head">
        <h2 className="sp-group-title">{title}</h2>
        {subtitle && <p className="sp-group-sub">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ icon, title, desc, accent = "#2563eb", tipRows, docxTips, footer, children, className = "" }) {
  return (
    <article className={`sp-panel ${className}`.trim()}>
      <header className="sp-panel-head" style={{ "--sp-accent": accent }}>
        <div className="sp-panel-icon">{icon}</div>
        <div className="sp-panel-meta">
          <h3 className="sp-panel-title">{title}</h3>
          {desc && <p className="sp-panel-desc">{desc}</p>}
        </div>
        {tipRows && <TipPopover rows={tipRows} docxOnly={docxTips} />}
      </header>
      <div className="sp-panel-body">{children}</div>
      {footer && <footer className="sp-panel-foot">{footer}</footer>}
    </article>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="sp-field">
      <label className="sp-label">{label}</label>
      {children}
      {hint && <p className="sp-field-hint">{hint}</p>}
    </div>
  );
}

const FULLTIME_VARS = [
  { placeholder: "name", label: "Candidate's full name", example: "Manimaran P" },
  { placeholder: "salary", label: "Annual CTC / salary", example: "₹6,00,000 per annum" },
  { placeholder: "joining_date", label: "Date of joining", example: "01-06-2025" },
  { placeholder: "issue_date", label: "Auto-filled — today", example: "19-05-2025" },
  { placeholder: "role", label: "Job role", example: "Software Engineer" },
];

const INTERN_VARS = [
  { placeholder: "name", label: "Candidate's full name", example: "Manimaran P" },
  { placeholder: "stipend", label: "Monthly stipend", example: "₹5,000 per month" },
  { placeholder: "months", label: "Duration in months", example: "6" },
  { placeholder: "joining_date", label: "Date of joining", example: "01-06-2025" },
  { placeholder: "issue_date", label: "Auto-filled — today", example: "19-05-2025" },
  { placeholder: "role", label: "Internship role", example: "Trainee - Software Engineer" },
];

const INTERVIEW_VARS = [
  { placeholder: "name", label: "Candidate name", example: "Manimaran P" },
  { placeholder: "date", label: "Interview date", example: "25-05-2025" },
  { placeholder: "time", label: "Interview time", example: "10:30 AM" },
  { placeholder: "role", label: "Applied role", example: "Software Engineer" },
];

const REJECT_VARS = [
  { placeholder: "name", label: "Candidate name", example: "Manimaran P" },
  { placeholder: "role", label: "Applied role", example: "Software Engineer" },
];

const GOOGLE_VARS = [
  { placeholder: "name", label: "Candidate name", example: "Manimaran P" },
  { placeholder: "google_form_link", label: "Google Form URL", example: "https://forms.gle/xyz" },
  { placeholder: "close_time", label: "Form closing time", example: "31-05-2025 5:00 PM" },
];

export default function SettingsPage() {
  const lockScroll = useScrollLock();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState("Interview Scheduled");
  const [template, setTemplate] = useState("");
  const [rejectSubject, setRejectSubject] = useState("Application Update — Nikitha Build Tech");
  const [rejectTemplate, setRejectTemplate] = useState("");
  const [googleTemplate, setGoogleTemplate] = useState("");
  const [googleSubject, setGoogleSubject] = useState("Candidate Application Form");
  const [googleForm, setGoogleForm] = useState("");
  const [loading, setLoading] = useState(false);
  const [offerFile, setOfferFile] = useState(null);
  const [internFile, setInternFile] = useState(null);
  const [editEmail, setEditEmail] = useState(false);
  const [editMailTemplates, setEditMailTemplates] = useState(false);
  const [editGoogle, setEditGoogle] = useState(false);
  const [editOffer, setEditOffer] = useState(false);
  const [editIntern, setEditIntern] = useState(false);
  const [offerUploaded, setOfferUploaded] = useState(false);
  const [internUploaded, setInternUploaded] = useState(false);
  const [googleSnapshot, setGoogleSnapshot] = useState(null);
  const [mailSnapshot, setMailSnapshot] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [editGemini, setEditGemini] = useState(false);
  const [geminiSnapshot, setGeminiSnapshot] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const emailRes = await API.get("/get-email-settings");
        setEmail(emailRes.data.email || "");
        const tempRes = await API.get("/get-template");
        setTemplate(tempRes.data.interview_template || "");
        setSubject(tempRes.data.interview_subject || "Interview Scheduled");
        setRejectTemplate(tempRes.data.reject_template || "");
        setRejectSubject(tempRes.data.reject_subject || "Application Update — Nikitha Build Tech");
        const formRes = await API.get("/get-google-form");
        setGoogleForm(formRes.data.form_link || "");
        const gTempRes = await API.get("/get-google-template");
        setGoogleTemplate(gTempRes.data.body || "");
        setGoogleSubject(gTempRes.data.subject || "Candidate Application Form");
        try { await API.get("/check-offer-template?type=fulltime"); setOfferUploaded(true); } catch { /* none */ }
        try { await API.get("/check-offer-template?type=intern"); setInternUploaded(true); } catch { /* none */ }
        try {
          const geminiRes = await API.get("/get-gemini-settings");
          setGeminiKey(geminiRes.data.api_key || "");
        } catch { /* none */ }
      } catch (err) { console.log(err); }
    })();
  }, []);

  const startEditEmail = () => { lockScroll(); setEditEmail(true); };
  const cancelEmail = () => { lockScroll(); setEditEmail(false); setPassword(""); };

  const startEditMailTemplates = () => {
    lockScroll();
    setMailSnapshot({ subject, template, rejectSubject, rejectTemplate });
    setEditMailTemplates(true);
  };
  const cancelMailTemplates = () => {
    lockScroll();
    if (mailSnapshot) {
      setSubject(mailSnapshot.subject);
      setTemplate(mailSnapshot.template);
      setRejectSubject(mailSnapshot.rejectSubject);
      setRejectTemplate(mailSnapshot.rejectTemplate);
    }
    setEditMailTemplates(false);
  };

  const startEditGoogle = () => {
    lockScroll();
    setGoogleSnapshot({ googleForm, googleSubject, googleTemplate });
    setEditGoogle(true);
  };
  const cancelEditGoogle = () => {
    lockScroll();
    if (googleSnapshot) {
      setGoogleForm(googleSnapshot.googleForm);
      setGoogleSubject(googleSnapshot.googleSubject);
      setGoogleTemplate(googleSnapshot.googleTemplate);
    }
    setEditGoogle(false);
  };

  const startEditOffer = () => { lockScroll(); setEditOffer(true); };
  const cancelOffer = () => { lockScroll(); setEditOffer(false); setOfferFile(null); };
  const startEditIntern = () => { lockScroll(); setEditIntern(true); };
  const cancelIntern = () => { lockScroll(); setEditIntern(false); setInternFile(null); };

  const startEditGemini = () => { lockScroll(); setGeminiSnapshot(geminiKey); setEditGemini(true); };
  const cancelGemini = () => { lockScroll(); if (geminiSnapshot !== null) setGeminiKey(geminiSnapshot); setEditGemini(false); };
  
  const handleSaveGemini = async () => {
    try {
      setLoading(true);
      await API.post("/save-gemini-settings", { api_key: geminiKey });
      toast.success("Gemini API key saved successfully");
      setEditGemini(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email || !password) { toast.error("Enter email and app password"); return; }
    try {
      setLoading(true);
      await API.post("/save-email-settings", { email, password });
      toast.success("Email settings saved");
      setPassword("");
      setEditEmail(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject.trim()) { toast.error("Interview subject cannot be empty"); return; }
    if (!rejectSubject.trim()) { toast.error("Rejection subject cannot be empty"); return; }
    try {
      await API.post("/save-template", {
        interview_subject: subject,
        interview_template: template,
        reject_subject: rejectSubject,
        reject_template: rejectTemplate,
      });
      toast.success("Email templates saved");
      setEditMailTemplates(false);
      setMailSnapshot(null);
    } catch {
      toast.error("Save failed");
    }
  };

  const handleSaveGoogleSettings = async () => {
    if (googleForm && (googleForm.includes("docs.google.com/forms") || googleForm.includes("forms.gle"))) {
      toast.error(
        "You entered a Google Form URL instead of the Google Sheet CSV URL. " +
        "Please publish the associated Google Sheet as CSV and configure that CSV link instead.",
        { duration: 8000 }
      );
      return;
    }
    try {
      await API.post("/save-google-form", { form_link: googleForm });
      await API.post("/save-google-template", { subject: googleSubject, body: googleTemplate });
      toast.success("Google form settings saved");
      setEditGoogle(false);
      setGoogleSnapshot(null);
    } catch {
      toast.error("Save failed");
    }
  };

  const handleUploadOffer = async () => {
    if (!offerFile) { toast.error("Select a .docx file"); return; }
    const fd = new FormData();
    fd.append("file", offerFile);
    try {
      await API.post("/upload-offer-template", fd);
      toast.success("Full-time offer template uploaded");
      setEditOffer(false);
      setOfferUploaded(true);
      setOfferFile(null);
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleUploadInternOffer = async () => {
    if (!internFile) { toast.error("Select a .docx file"); return; }
    const fd = new FormData();
    fd.append("file", internFile);
    try {
      await API.post("/upload-intern-offer-template", fd);
      toast.success("Internship offer template uploaded");
      setEditIntern(false);
      setInternUploaded(true);
      setInternFile(null);
    } catch {
      toast.error("Upload failed");
    }
  };

  const mailLocked = !editMailTemplates;

  return (
    <div className="sp-page">

      <header className="sp-hero">
        <div className="sp-hero-main">
          <div className="sp-hero-icon" aria-hidden>⚙️</div>
          <div>
            <h1 className="sp-hero-title">HR Settings</h1>
            <p className="sp-hero-sub">Configure sender account, email copy, Google Form, and offer letter files.</p>
          </div>
        </div>
        <nav className="sp-hero-nav" aria-label="Settings sections">
          <a href="#account" className="sp-hero-pill">Account</a>
          <a href="#templates" className="sp-hero-pill">Templates</a>
          <a href="#google" className="sp-hero-pill">Google Form</a>
          <a href="#offers" className="sp-hero-pill">Offer letters</a>
        </nav>
      </header>

      {/* ── Account ── */}
      <SectionGroup id="account" title="Sender account" subtitle="Gmail used for interview, rejection, offer, and form emails.">
        <Panel
          icon="📧"
          title="Email configuration"
          desc="Use a Gmail address with a 16-character app password."
          accent="#2563eb"
          footer={
            !editEmail ? (
              <button type="button" className="btn-outline sp-btn" onClick={startEditEmail}>Edit credentials</button>
            ) : (
              <div className="sp-foot-actions">
                <button type="button" className="btn-primary sp-btn" onClick={handleSaveEmail} disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </button>
                <button type="button" className="btn-outline sp-btn" onClick={cancelEmail}>Cancel</button>
              </div>
            )
          }
        >
          <div className="sp-form-grid sp-form-grid--2">
            <Field label="Gmail address">
              <input
                type="email"
                className="modern-input sp-input"
                placeholder="hr@company.com"
                value={email}
                disabled={!editEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {editEmail && (
              <Field label="App password" hint="Generate at Google Account → Security → App passwords.">
                <input
                  type="password"
                  className="modern-input sp-input"
                  placeholder="16-character app password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="sp-link"
                >
                  How to create an app password →
                </a>
              </Field>
            )}
          </div>
          {!editEmail && email && (
            <div className="sp-status sp-status--ok">
              <span className="sp-status-dot" />
              Connected as <strong>{email}</strong>
            </div>
          )}
        </Panel>
      </SectionGroup>



      {/* ── Pipeline email templates ── */}
      <SectionGroup id="templates" title="Pipeline emails" subtitle="Messages sent when scheduling interviews and when rejecting candidates.">
        <Panel
          icon="✉️"
          title="Interview & rejection templates"
          desc="Placeholders are filled automatically when emails are sent from the hiring pipeline."
          accent="#7c3aed"
          className="sp-panel--wide"
          footer={
            !editMailTemplates ? (
              <button type="button" className="btn-outline sp-btn" onClick={startEditMailTemplates}>Edit templates</button>
            ) : (
              <div className="sp-foot-actions">
                <button type="button" className="btn-primary sp-btn" onClick={handleSaveTemplate}>Save both templates</button>
                <button type="button" className="btn-outline sp-btn" onClick={cancelMailTemplates}>Cancel</button>
              </div>
            )
          }
        >
          <div className="sp-template-split">
            {/* Interview */}
            <div className="sp-template-block">
              <div className="sp-template-block-head">
                <span className="sp-template-badge sp-template-badge--interview">Selection Template</span>
                <TipPopover rows={INTERVIEW_VARS} />
              </div>
              <Field label="Subject">
                <input
                  type="text"
                  className="modern-input sp-input"
                  placeholder="Interview Scheduled — {role}"
                  value={subject}
                  disabled={mailLocked}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Field>
              <Field label="Body">
                <textarea
                  className="jd-textarea sp-textarea sp-textarea--md"
                  value={template}
                  disabled={mailLocked}
                  placeholder={"Dear {name},\n\nYour interview is on {date} at {time}.\n\nRole: {role}\n\nRegards,\nHR Team"}
                  onChange={(e) => setTemplate(e.target.value)}
                />
              </Field>
            </div>

            <div className="sp-template-divider" aria-hidden />

            {/* Rejection */}
            <div className="sp-template-block">
              <div className="sp-template-block-head">
                <span className="sp-template-badge sp-template-badge--reject">Rejection Template</span>
                <TipPopover rows={REJECT_VARS} />
              </div>
              <Field label="Subject">
                <input
                  type="text"
                  className="modern-input sp-input"
                  placeholder="Application Update — Nikitha Build Tech"
                  value={rejectSubject}
                  disabled={mailLocked}
                  onChange={(e) => setRejectSubject(e.target.value)}
                />
              </Field>
              <Field label="Body">
                <textarea
                  className="jd-textarea sp-textarea sp-textarea--md"
                  value={rejectTemplate}
                  disabled={mailLocked}
                  placeholder={"Dear {name},\n\nThank you for applying for {role}.\n\nRegrettably, we will not proceed further.\n\nRegards,\nHR Team"}
                  onChange={(e) => setRejectTemplate(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Panel>
      </SectionGroup>

      {/* ── Google Form ── */}
      <SectionGroup id="google" title="Application form" subtitle="Google Form link and email sent to new applicants.">
        <Panel
          icon="📝"
          title="Google Form integration"
          desc="Applicants receive this email with your form link."
          accent="#059669"
          tipRows={GOOGLE_VARS}
          footer={
            !editGoogle ? (
              <div className="sp-foot-actions">
                <button type="button" className="btn-outline sp-btn" onClick={startEditGoogle}>Edit settings</button>
                <button
                  type="button"
                  className="btn-outline sp-btn"
                  onClick={() => window.open("https://docs.google.com/forms", "_blank")}
                >
                  Open Google Forms
                </button>
              </div>
            ) : (
              <div className="sp-foot-actions">
                <button type="button" className="btn-primary sp-btn" onClick={handleSaveGoogleSettings}>Save</button>
                <button type="button" className="btn-outline sp-btn" onClick={cancelEditGoogle}>Cancel</button>
                <button
                  type="button"
                  className="btn-outline sp-btn"
                  onClick={() => window.open("https://docs.google.com/forms", "_blank")}
                >
                  Open Google Forms
                </button>
              </div>
            )
          }
        >
          <Field label="Google Sheet CSV URL">
            <input
              type="url"
              className="modern-input sp-input"
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              value={googleForm}
              disabled={!editGoogle}
              onChange={(e) => setGoogleForm(e.target.value)}
            />
            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", marginTop: "4px" }}>
              Provide the published CSV URL of the Google Sheet containing form responses (File → Share → Publish to web → CSV).
            </div>
          </Field>
          <div className="sp-form-grid sp-form-grid--2">
            <Field label="Email subject">
              <input
                type="text"
                className="modern-input sp-input"
                value={googleSubject}
                disabled={!editGoogle}
                onChange={(e) => setGoogleSubject(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Email body">
            <textarea
              className="jd-textarea sp-textarea sp-textarea--md"
              value={googleTemplate}
              disabled={!editGoogle}
              onChange={(e) => setGoogleTemplate(e.target.value)}
            />
          </Field>
          {!editGoogle && googleForm && (
            <div className="sp-status sp-status--ok">
              <span className="sp-status-dot" />
              Form link configured
            </div>
          )}
        </Panel>
      </SectionGroup>

      {/* ── Offer letters ── */}
      <SectionGroup id="offers" title="Offer letter files" subtitle="Word templates attached when sending offers in the pipeline.">
        <div className="sp-offer-row">
          <Panel
            icon="📄"
            title="Full-time offer"
            desc="Saved as offer.docx"
            accent="#d97706"
            tipRows={FULLTIME_VARS}
            docxTips
            footer={
              !editOffer ? (
                <button type="button" className="btn-outline sp-btn sp-btn--block" onClick={startEditOffer}>
                  {offerUploaded ? "Replace file" : "Upload .docx"}
                </button>
              ) : (
                <div className="sp-foot-actions sp-foot-actions--stack">
                  <button type="button" className="btn-primary sp-btn sp-btn--block" onClick={handleUploadOffer}>Upload</button>
                  <button type="button" className="btn-outline sp-btn sp-btn--block" onClick={cancelOffer}>Cancel</button>
                </div>
              )
            }
          >
            {offerUploaded && !editOffer && (
              <div className="sp-status sp-status--ok">
                <span className="sp-status-dot" />
                offer.docx ready
              </div>
            )}
            {editOffer && (
              <div className="sp-file-zone">
                <span className="sp-file-icon" aria-hidden>📂</span>
                <p className="sp-file-hint">Drop or click to choose <strong>.docx</strong></p>
                <input
                  type="file"
                  accept=".docx"
                  className="sp-file-input"
                  onChange={(e) => setOfferFile(e.target.files?.[0] || null)}
                />
                {offerFile && <p className="sp-file-name">{offerFile.name}</p>}
              </div>
            )}
            {!offerUploaded && !editOffer && (
              <p className="sp-empty-hint">No template uploaded yet.</p>
            )}
          </Panel>

          <Panel
            icon="🎓"
            title="Internship offer"
            desc="Saved as intern_offer.docx"
            accent="#db2777"
            tipRows={INTERN_VARS}
            docxTips
            footer={
              !editIntern ? (
                <button type="button" className="btn-outline sp-btn sp-btn--block" onClick={startEditIntern}>
                  {internUploaded ? "Replace file" : "Upload .docx"}
                </button>
              ) : (
                <div className="sp-foot-actions sp-foot-actions--stack">
                  <button type="button" className="btn-primary sp-btn sp-btn--block" onClick={handleUploadInternOffer}>Upload</button>
                  <button type="button" className="btn-outline sp-btn sp-btn--block" onClick={cancelIntern}>Cancel</button>
                </div>
              )
            }
          >
            {internUploaded && !editIntern && (
              <div className="sp-status sp-status--ok">
                <span className="sp-status-dot" />
                intern_offer.docx ready
              </div>
            )}
            {editIntern && (
              <div className="sp-file-zone">
                <span className="sp-file-icon" aria-hidden>📂</span>
                <p className="sp-file-hint">Drop or click to choose <strong>.docx</strong></p>
                <input
                  type="file"
                  accept=".docx"
                  className="sp-file-input"
                  onChange={(e) => setInternFile(e.target.files?.[0] || null)}
                />
                {internFile && <p className="sp-file-name">{internFile.name}</p>}
              </div>
            )}
            {!internUploaded && !editIntern && (
              <p className="sp-empty-hint">No template uploaded yet.</p>
            )}
          </Panel>
        </div>
      </SectionGroup>

    </div>
  );
}
