import React, { useState, useEffect } from "react";
import "../../styles.css";

// ─── Nikitha Logo Header ────────────────────────────────────────────────────
const NikithaHeader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid black',
    padding: '10px 14px',
    marginBottom: 0
  }}>
    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>
      Profile No. Nikitha /HR /
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <img
        src="/logo.png?v=2"
        alt="Nikitha Logo"
        style={{ height: '52px', objectFit: 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <span style={{ display: 'none', fontWeight: '900', fontSize: '18px', color: '#1a3fa6', letterSpacing: '1px' }}>
        NIKITHA
        <span style={{ display: 'block', fontSize: '9px', fontWeight: '500', color: '#444', letterSpacing: '0.5px' }}>
          AN ISO CERTIFIED COMPANY<br />9001:2015•14001:2015•45001:2018
        </span>
      </span>
    </div>
  </div>
);

// ─── Doc table styles ─────────────────────────────────────────────────────────
const ds = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  tdLabel: { border: '1px solid #333', padding: '5px 8px', fontWeight: '600', color: '#1a1a1a', verticalAlign: 'middle', width: '42%' },
  tdInput: { border: '1px solid #333', padding: 0, verticalAlign: 'middle' },
  input: { width: '100%', border: 'none', padding: '5px 8px', boxSizing: 'border-box', outline: 'none', background: 'transparent', fontSize: '13px' },
  sectionHeader: { border: '1px solid #333', padding: '6px 8px', fontWeight: '700', textAlign: 'center', background: '#f5f5f5', fontSize: '14px' },
};

// ─── Full Interview Assessment Form ──────────────────────────────────────────
// readOnly = true  → shows pre-filled data without editable inputs
// readOnly = false → editable form for candidate info + HR remarks
function InterviewAssessmentForm({ formData, onChange, readOnly = false, hideSection2 = false }) {

  const field = (name, minH) => {
    const val = formData[name] || '';
    if (readOnly) {
      return (
        <div style={{ ...ds.input, minHeight: minH || 'auto', whiteSpace: 'pre-wrap', color: '#333' }}>
          {val || '\u00A0'}
        </div>
      );
    }
    if (minH) {
      return (
        <textarea
          name={name}
          value={val}
          onChange={onChange}
          style={{ ...ds.input, minHeight: minH, resize: 'vertical' }}
        />
      );
    }
    return <input name={name} value={val} onChange={onChange} style={ds.input} />;
  };

  return (
    <div style={{ border: '1px solid #333', background: 'white', fontFamily: 'Arial, sans-serif' }}>
      <NikithaHeader />

      {/* Titles */}
      <div style={{ textAlign: 'center', borderBottom: '1px solid #333', padding: '6px', fontWeight: '700', fontSize: '15px' }}>
        Interview Assessment Form
      </div>
      <div style={{ textAlign: 'center', borderBottom: '1px solid #333', padding: '5px', fontWeight: '700', fontSize: '13px' }}>
        Private &amp; Confidential
      </div>

      <table style={ds.table}>
        <tbody>
          {/* Top fields */}
          <tr><td style={ds.tdLabel}>Position Applied For</td><td style={ds.tdInput}>{field('positionAppliedFor')}</td></tr>
          <tr><td style={ds.tdLabel}>Department</td><td style={ds.tdInput}>{field('department')}</td></tr>
          <tr><td style={ds.tdLabel}>Location</td><td style={ds.tdInput}>{field('location')}</td></tr>

          {/* Personal Information Header */}
          <tr><td colSpan={2} style={ds.sectionHeader}>Personal Information of Candidate</td></tr>

          <tr><td style={ds.tdLabel}>Name of candidate</td><td style={ds.tdInput}>{field('name')}</td></tr>
          <tr><td style={ds.tdLabel}>Date of Birth &amp; Age</td><td style={ds.tdInput}>{field('dob')}</td></tr>
          <tr><td style={ds.tdLabel}>Qualification</td><td style={ds.tdInput}>{field('qualification')}</td></tr>
          <tr><td style={ds.tdLabel}>Year of Passing</td><td style={ds.tdInput}>{field('yearOfPassing')}</td></tr>
          <tr><td style={ds.tdLabel}>Presently working with</td><td style={ds.tdInput}>{field('currentCompany')}</td></tr>
          <tr><td style={ds.tdLabel}>Designation</td><td style={ds.tdInput}>{field('currentDesignation')}</td></tr>
          <tr><td style={ds.tdLabel}>Previous Firm</td><td style={ds.tdInput}>{field('previousFirm')}</td></tr>
          <tr><td style={ds.tdLabel}>Designation</td><td style={ds.tdInput}>{field('previousDesignation')}</td></tr>
          <tr><td style={ds.tdLabel}>Overall Experience (In Years)</td><td style={ds.tdInput}>{field('overallExperience')}</td></tr>
          <tr><td style={ds.tdLabel}>Relevant Experience for the post applied (In Years)</td><td style={ds.tdInput}>{field('relevantExperience')}</td></tr>
          <tr><td style={ds.tdLabel}>Salary drawn in the previous/current employment</td><td style={ds.tdInput}>{field('currentSalary')}</td></tr>
          <tr><td style={ds.tdLabel}>Expected Salary:</td><td style={ds.tdInput}>{field('expectedSalary')}</td></tr>
          <tr><td style={ds.tdLabel}>Specializations If any (Computer/Software)</td><td style={ds.tdInput}>{field('specializations')}</td></tr>
          <tr>
            <td style={ds.tdLabel}>Address:</td>
            <td style={ds.tdInput}>{field('address', '60px')}</td>
          </tr>
          <tr><td style={ds.tdLabel}>Contact No.</td><td style={ds.tdInput}>{field('phone')}</td></tr>
          <tr><td style={ds.tdLabel}>Referred by:</td><td style={ds.tdInput}>{field('referredBy')}</td></tr>
          <tr><td style={ds.tdLabel}>Notice Period:</td><td style={ds.tdInput}>{field('noticePeriod')}</td></tr>

          {/* Section 1: Telephonic Remarks by HR */}
          <tr>
            <td style={{ ...ds.tdLabel, fontWeight: '700' }}>1. Telephonic Interview remarks by HR</td>
            <td style={ds.tdInput}>{field('hrRemarks', '70px')}</td>
          </tr>
          <tr><td style={ds.tdLabel}>Signature:</td><td style={ds.tdInput}>{field('hrSignature')}</td></tr>

          {/* Section 2: Dept Interview (only show when NOT hideSection2) */}
          {!hideSection2 && (
            <>
              <tr><td colSpan={2} style={{ ...ds.tdLabel, fontWeight: '700', background: '#f5f5f5' }}>2. Telephonic / Face to Face Interview by Department</td></tr>
              <tr><td style={ds.tdLabel}>Professional Experience</td><td style={ds.tdInput}>{field('deptProfessionalExperience')}</td></tr>
              <tr><td style={ds.tdLabel}>Professional Knowledge</td><td style={ds.tdInput}>{field('deptProfessionalKnowledge')}</td></tr>
              <tr><td style={ds.tdLabel}>Recommended for Final Interview</td><td style={ds.tdInput}>{field('deptRecommended')}</td></tr>
              <tr><td style={ds.tdLabel}>Rejected</td><td style={ds.tdInput}>{field('deptRejected')}</td></tr>
              <tr>
                <td style={ds.tdLabel}>Remarks</td>
                <td style={ds.tdInput}>{field('deptRemarks', '70px')}</td>
              </tr>
              <tr><td style={ds.tdLabel}>Name of Interviewer:</td><td style={ds.tdInput}>{field('deptInterviewerName')}</td></tr>
              <tr>
                <td style={ds.tdLabel}>Signature:</td>
                <td style={ds.tdInput}>{field('deptSignature', '50px')}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Dept-only Section 2 form (empty for HR to fill) ─────────────────────────
function DeptInterviewForm({ formData, onChange, readOnly = false }) {
  const field = (name, minH) => {
    const val = formData[name] || '';
    if (readOnly) {
      return (
        <div style={{ ...ds.input, minHeight: minH || 'auto', whiteSpace: 'pre-wrap', color: '#333' }}>
          {val || '\u00A0'}
        </div>
      );
    }
    if (minH) {
      return (
        <textarea
          name={name}
          value={val}
          onChange={onChange}
          style={{ ...ds.input, minHeight: minH, resize: 'vertical' }}
        />
      );
    }
    return <input name={name} value={val} onChange={onChange} style={ds.input} />;
  };

  return (
    <div style={{ border: '1px solid #333', background: 'white', fontFamily: 'Arial, sans-serif' }}>
      <NikithaHeader />

      <div style={{ textAlign: 'center', borderBottom: '1px solid #333', padding: '6px', fontWeight: '700', fontSize: '15px' }}>
        Interview Assessment Form
      </div>
      <div style={{ textAlign: 'center', borderBottom: '1px solid #333', padding: '5px', fontWeight: '700', fontSize: '13px' }}>
        Private &amp; Confidential
      </div>

      <table style={ds.table}>
        <tbody>
          <tr><td colSpan={2} style={{ ...ds.tdLabel, fontWeight: '700', background: '#f5f5f5' }}>2. Telephonic / Face to Face Interview by Department</td></tr>
          <tr><td style={ds.tdLabel}>Professional Experience</td><td style={ds.tdInput}>{field('deptProfessionalExperience')}</td></tr>
          <tr><td style={ds.tdLabel}>Professional Knowledge</td><td style={ds.tdInput}>{field('deptProfessionalKnowledge')}</td></tr>
          <tr><td style={ds.tdLabel}>Recommended for Final Interview</td><td style={ds.tdInput}>{field('deptRecommended')}</td></tr>
          <tr><td style={ds.tdLabel}>Rejected</td><td style={ds.tdInput}>{field('deptRejected')}</td></tr>
          <tr>
            <td style={ds.tdLabel}>Remarks</td>
            <td style={ds.tdInput}>{field('deptRemarks', '70px')}</td>
          </tr>
          <tr><td style={ds.tdLabel}>Name of Interviewer:</td><td style={ds.tdInput}>{field('deptInterviewerName')}</td></tr>
          <tr>
            <td style={ds.tdLabel}>Signature:</td>
            <td style={ds.tdInput}>{field('deptSignature', '50px')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── F2F Rating Form (editable) ──────────────────────────────────────────────
function F2FForm({ formData, onChange, onRatingChange }) {
  const categories = {
    "I. Skills": ["Communication Skills", "Persuasion Skills", "Rapport Building", "Telephone Etiquettes", "Selling Skills", "Negotiating Skills", "Listening Skills", "Questioning Skills"],
    "II. Knowledge": ["Microsoft Word, Excel, PowerPoint", "Internet Usage & Data Finding"],
    "III. Self-Image": ["Confident", "Go Getter"],
    "IV. Traits": ["High Energy", "Persistent", "Willingness to learn", "Hospitable", "Honest"],
    "V. Motives": ["Hungry for Personal Growth", "Win-Win Philosophy"]
  };

  const verifyDocs = [
    { label: "Academics Certificates & Marks Card's", key: "docsAcademics" },
    { label: "Pay slips",                              key: "docsPayslips"  },
    { label: "Experience/Relieving Letters",           key: "docsExperience"},
    { label: "Address Proof & ID Proof",               key: "docsIdProof"  },
    { label: "Two Reference check",                    key: "docsTwoRef"   },
  ];

  const calculateAverage = (ratings) => {
    if (!ratings) return '0.00';
    let sum = 0;
    let count = 0;
    Object.values(ratings).forEach(catRatings => {
      if (catRatings && typeof catRatings === 'object') {
        Object.values(catRatings).forEach(val => {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        });
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : '0.00';
  };

  return (
    <div style={{ border: '1px solid #333', background: 'white', fontFamily: 'Arial, sans-serif' }}>
      <NikithaHeader />
      <div style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #333', fontWeight: '700', fontSize: '16px' }}>
        Face to Face Interview – HR
      </div>

      {/* ── Skills / Knowledge / Traits Ratings ── */}
      <table style={ds.table}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left', width: '75%' }}>Parameters</th>
            <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left' }}>Ratings</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categories).map(([cat, params]) => (
            <React.Fragment key={cat}>
              <tr>
                <td colSpan={2} style={{ border: '1px solid #333', padding: '7px 8px', fontWeight: '700', background: '#fafafa' }}>{cat}</td>
              </tr>
              {params.map(p => (
                <tr key={p}>
                  <td style={{ border: '1px solid #333', padding: '6px 8px' }}>{p}</td>
                  <td style={{ border: '1px solid #333', padding: 0 }}>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="0 - 10"
                      value={formData.ratings?.[cat]?.[p] || ''}
                      onChange={e => {
                        let val = e.target.value;
                        if (val !== "") {
                          const num = parseFloat(val);
                          if (num < 0) val = "0";
                          if (num > 10) val = "10";
                        }
                        onRatingChange(cat, p, val);
                      }}
                      style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                    />
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr>
            <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '700', background: '#eef2ff' }}>
              Overall Score (Average)
            </td>
            <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '700', background: '#eef2ff', color: '#1a3fa6', fontSize: '15px' }}>
              {calculateAverage(formData.ratings)} / 10
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #333', padding: '7px 8px', fontWeight: '700' }}>Remarks by HR</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #333', padding: 0 }}>
              <textarea
                name="overallRemarks"
                value={formData.overallRemarks || ''}
                onChange={onChange}
                style={{ ...ds.input, minHeight: '80px', resize: 'vertical' }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Verification of documents & Reference check ── */}
      <table style={{ ...ds.table, borderTop: '2px solid #333' }}>
        <thead>
          <tr>
            <th colSpan={3} style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px', background: '#f5f5f5' }}>
              Verification of documents &amp; Reference check
            </th>
          </tr>
          <tr>
            <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'left', width: '60%' }}>Documents</th>
            <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', width: '20%' }}>Checked</th>
            <th style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', width: '20%' }}>Verified</th>
          </tr>
        </thead>
        <tbody>
          {verifyDocs.map(({ label, key }) => (
            <tr key={key}>
              <td style={{ border: '1px solid #333', padding: '8px' }}>{label}</td>
              <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'center' }}>
                <input type="checkbox"
                  checked={formData[`${key}_checked`] || false}
                  onChange={e => onChange({ target: { name: `${key}_checked`, type: 'checkbox', checked: e.target.checked } })}
                />
              </td>
              <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'center' }}>
                <input type="checkbox"
                  checked={formData[`${key}_verified`] || false}
                  onChange={e => onChange({ target: { name: `${key}_verified`, type: 'checkbox', checked: e.target.checked } })}
                />
              </td>
            </tr>
          ))}
          {/* Extra blank row for signature */}
          <tr>
            <td colSpan={3} style={{ border: '1px solid #333', padding: '28px 8px' }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── F2F Form Read-Only (shown inside Final Round) ───────────────────────────
function F2FFormReadOnly({ formData }) {
  if (!formData || !Object.keys(formData).length) return null;

  const categories = {
    "I. Skills": ["Communication Skills", "Persuasion Skills", "Rapport Building", "Telephone Etiquettes", "Selling Skills", "Negotiating Skills", "Listening Skills", "Questioning Skills"],
    "II. Knowledge": ["Microsoft Word, Excel, PowerPoint", "Internet Usage & Data Finding"],
    "III. Self-Image": ["Confident", "Go Getter"],
    "IV. Traits": ["High Energy", "Persistent", "Willingness to learn", "Hospitable", "Honest"],
    "V. Motives": ["Hungry for Personal Growth", "Win-Win Philosophy"]
  };

  const verifyDocs = [
    { label: "Academics Certificates & Marks Card's", key: "docsAcademics" },
    { label: "Pay slips",                              key: "docsPayslips"  },
    { label: "Experience/Relieving Letters",           key: "docsExperience"},
    { label: "Address Proof & ID Proof",               key: "docsIdProof"  },
    { label: "Two Reference check",                    key: "docsTwoRef"   },
  ];

  const calculateAverage = (ratings) => {
    if (!ratings) return '0.00';
    let sum = 0;
    let count = 0;
    Object.values(ratings).forEach(catRatings => {
      if (catRatings && typeof catRatings === 'object') {
        Object.values(catRatings).forEach(val => {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        });
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : '0.00';
  };

  const cell = (txt) => (
    <div style={{ ...ds.input, minHeight: 24, color: '#333', whiteSpace: 'pre-wrap' }}>{txt || '\u00A0'}</div>
  );

  return (
    <div style={{ border: '1px solid #ccc', background: '#fafcff', fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      <div style={{ textAlign: 'center', padding: '6px', borderBottom: '1px solid #ccc', fontWeight: '700', fontSize: '14px', background: '#eef2ff', color: '#1a3fa6' }}>
        Face to Face Interview – HR (Read-only)
      </div>
      <table style={ds.table}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left', width: '75%', background: '#f5f5f5' }}>Parameters</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left', background: '#f5f5f5' }}>Ratings</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categories).map(([cat, params]) => (
            <React.Fragment key={cat}>
              <tr><td colSpan={2} style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: '700', background: '#f9f9f9' }}>{cat}</td></tr>
              {params.map(p => (
                <tr key={p}>
                  <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{p}</td>
                  <td style={{ border: '1px solid #ccc', padding: 0 }}>{cell(formData.ratings?.[cat]?.[p])}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontWeight: '700', background: '#eef2ff' }}>
              Overall Score (Average)
            </td>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontWeight: '700', background: '#eef2ff', color: '#1a3fa6' }}>
              {calculateAverage(formData.ratings)} / 10
            </td>
          </tr>
          <tr><td colSpan={2} style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: '700' }}>Remarks by HR</td></tr>
          <tr><td colSpan={2} style={{ border: '1px solid #ccc', padding: 0 }}>{cell(formData.overallRemarks)}</td></tr>
        </tbody>
      </table>
      <table style={{ ...ds.table, borderTop: '1.5px solid #ccc' }}>
        <thead>
          <tr><th colSpan={3} style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', fontWeight: '700', background: '#f5f5f5' }}>Verification of documents &amp; Reference check</th></tr>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', width: '60%', background: '#f5f5f5' }}>Documents</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', background: '#f5f5f5' }}>Checked</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', background: '#f5f5f5' }}>Verified</th>
          </tr>
        </thead>
        <tbody>
          {verifyDocs.map(({ label, key }) => (
            <tr key={key}>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>{label}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formData[`${key}_checked`] ? '✅' : '—'}</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center' }}>{formData[`${key}_verified`] ? '✅' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Final Interview Form ──────────────────────────────────────────
const finalRows = [
  { key: 'deptTechTest',    label: 'Dept. Technical Test'                  },
  { key: 'deptTechF2F',     label: 'Dept./Technical Interview-Face to face' },
  { key: 'hrManagerIntv',   label: 'Interview-HR Manager'                  },
  { key: 'directorIntv',    label: 'Interview-Director'                    },
];

function FinalInterviewForm({ formData, onChange, candidate }) {

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Read-only Telephonic & Tech form ── */}
      {(candidate?.telephonic_form || candidate?.telephonic_tech_form) && (
        <div>
          <div style={{
            background: 'linear-gradient(90deg,#0369a1,#38bdf8)', color: 'white',
            padding: '8px 16px', borderRadius: '6px 6px 0 0',
            fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px'
          }}>
            📞 Telephonic & Tech Interview Assessment (Read-only)
          </div>
          <InterviewAssessmentForm 
            formData={{...(candidate?.telephonic_form || {}), ...(candidate?.telephonic_tech_form || {})}} 
            readOnly={true} 
            hideSection2={!candidate?.telephonic_tech_form} 
            onChange={() => {}} // No-op since it's read-only
          />
        </div>
      )}

      {/* ── Read-only F2F form ── */}
      {candidate?.f2f_form && Object.keys(candidate.f2f_form).length > 0 && (
        <div>
          <div style={{
            background: 'linear-gradient(90deg,#047857,#10b981)', color: 'white',
            padding: '8px 16px', borderRadius: '6px 6px 0 0',
            fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px'
          }}>
            🤝 Face to Face Interview Assessment — Filled during F2F Round (Read-only)
          </div>
          <F2FFormReadOnly formData={candidate.f2f_form} />
        </div>
      )}

      {/* ── Final Interview table ── */}
      <div>
        <table style={{ ...ds.table, border: '1px solid #333' }}>
          <thead>
            <tr>
              <th colSpan={3} style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '15px', background: '#f5f5f5' }}>
                Final Interview
              </th>
            </tr>
            <tr>
              <th style={{ border: '1px solid #333', padding: '8px', width: '35%' }}>Reviewed by</th>
              <th style={{ border: '1px solid #333', padding: '8px', width: '20%' }}>Date</th>
              <th style={{ border: '1px solid #333', padding: '8px' }}>Assessment</th>
            </tr>
          </thead>
          <tbody>
            {finalRows.map(row => (
              <tr key={row.key}>
                <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '600', verticalAlign: 'top', minHeight: 70 }}>
                  {row.label}
                </td>
                <td style={{ border: '1px solid #333', padding: 0 }}>
                  <input
                    type="date"
                    value={formData[`${row.key}_date`] || ''}
                    onChange={e => onChange({ target: { name: `${row.key}_date`, value: e.target.value } })}
                    style={{ ...ds.input, minHeight: 70 }}
                  />
                </td>
                <td style={{ border: '1px solid #333', padding: 0 }}>
                  <textarea
                    value={formData[`${row.key}_assessment`] || ''}
                    onChange={e => onChange({ target: { name: `${row.key}_assessment`, value: e.target.value } })}
                    style={{ ...ds.input, minHeight: 70, resize: 'vertical' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Negotiation / Offer Letter Form ──────────────────────────────────────────
function NegotiationForm({ formData, onChange, candidate }) {
  const benefits = [
    { label: 'Accommodation', key: 'benAccommodation' },
    { label: 'Food Allowance', key: 'benFood'         },
    { label: 'Transportation', key: 'benTransport'    },
    { label: 'SIM',            key: 'benSIM'          },
    { label: 'Email ID & ERP', key: 'benEmail'        },
    { label: 'Laptop',         key: 'benLaptop'       },
  ];



  return (
    <div style={{ fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>


      {/* ── Employee Benefits ── */}
      <table style={{ ...ds.table, border: '1px solid #333', borderTop: '2px solid #333' }}>
        <thead>
          <tr>
            <th colSpan={2} style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px', background: '#f5f5f5' }}>
              Employee Benefits
            </th>
          </tr>
          <tr>
            <th style={{ border: '1px solid #333', padding: '8px', width: '50%' }}>Benefits</th>
            <th style={{ border: '1px solid #333', padding: '8px' }}>Eligibility</th>
          </tr>
        </thead>
        <tbody>
          {benefits.map(b => (
            <tr key={b.key}>
              <td style={{ border: '1px solid #333', padding: '8px' }}>{b.label}</td>
              <td style={{ border: '1px solid #333', padding: 0 }}>
                <input
                  type="text"
                  value={formData[b.key] || ''}
                  onChange={e => onChange({ target: { name: b.key, value: e.target.value } })}
                  style={ds.input}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Final Assessment Sheet (For HR Only) ── */}
      <table style={{ ...ds.table, border: '1px solid #333', borderTop: '2px solid #333' }}>
        <tbody>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #333', padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '14px', background: '#f5f5f5' }}>
              Final Assessment Sheet (For HR Only)
            </td>
          </tr>

          {/* Salary line */}
          <tr>
            <td colSpan={2} style={{ border: '1px solid #333', padding: '10px 10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', fontSize: 13, lineHeight: 2 }}>
                <select
                  name="selectedSalutation"
                  value={formData.selectedSalutation || ''}
                  onChange={onChange}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #333',
                    outline: 'none',
                    padding: '2px 4px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Mr/Mrs/Ms.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
                <input name="selectedName" value={formData.selectedName || ''} onChange={onChange}
                  style={{ border: 'none', borderBottom: '1px solid #333', outline: 'none', padding: '2px 4px', fontSize: 13, width: 140 }} />
                <span>selected as</span>
                <input name="selectedAs" value={formData.selectedAs || ''} onChange={onChange}
                  style={{ border: 'none', borderBottom: '1px solid #333', outline: 'none', padding: '2px 4px', fontSize: 13, width: 160 }} />
                <span>and gross salary will be Rs.</span>
                <input name="ctcPerMonth" value={formData.ctcPerMonth || ''} onChange={onChange}
                  style={{ border: 'none', borderBottom: '1px solid #333', outline: 'none', padding: '2px 4px', fontSize: 13, width: 100 }} />
                <span>Per month and Rs.</span>
                <input name="ctcPerAnnum" value={formData.ctcPerAnnum || ''} onChange={onChange}
                  style={{ border: 'none', borderBottom: '1px solid #333', outline: 'none', padding: '2px 4px', fontSize: 13, width: 100 }} />
                <span>Gross Salary/ CTC. Per Annum</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '600', width: '40%' }}>Employee Type:</td>
            <td style={{ border: '1px solid #333', padding: 0 }}>
              <input name="employeeType" value={formData.employeeType || ''} onChange={onChange} style={ds.input} />
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '600' }}>Salary Review Remarks:</td>
            <td style={{ border: '1px solid #333', padding: 0 }}>
              <textarea name="salaryRemarks" value={formData.salaryRemarks || ''} onChange={onChange}
                style={{ ...ds.input, minHeight: 48, resize: 'vertical' }} />
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '600' }}>Expected Date of joining:</td>
            <td style={{ border: '1px solid #333', padding: 0 }}>
              <input type="date" name="expectedDateOfJoining" value={formData.expectedDateOfJoining || ''} onChange={onChange} style={ds.input} />
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #333', padding: '8px', fontWeight: '600' }}>Assistant Manager- HR and Admin</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #333', padding: '40px 8px 8px', fontWeight: '600' }}>Director-Administration</td>
            <td style={{ border: '1px solid #333', padding: '40px 8px 8px', fontWeight: '600' }}>Managing Director</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Main EvaluationForms component ──────────────────────────────────────────
export default function EvaluationForms({ candidate, round, onSave, onClose, inline = false }) {
  const [formData, setFormData] = useState({});

  // Pre-fill personal info from candidate data
  useEffect(() => {
    if (!candidate) return;

    const saved = candidate[`${round}_form`] || {};

    if (round === 'telephonic') {
      setFormData({
        name: candidate.name || '',
        phone: candidate.phone || '',
        qualification: candidate.degree || '',
        overallExperience: candidate.experience || '',
        noticePeriod: candidate.joining || '',
        ...saved,
      });
    } else if (round === 'telephonic_tech') {
      // For tech round, load telephonic_form data (read-only top) + dept data (editable bottom)
      const telData = candidate['telephonic_form'] || {};
      setFormData({
        ...telData,
        ...saved,  // merge saved dept data on top
      });
    } else if (round === 'f2f') {
      // Pre-fill F2F form with candidate details from previous stages
      const telData = candidate['telephonic_form'] || {};
      const techData = candidate['telephonic_tech_form'] || {};
      setFormData({
        candidateName: candidate.name || techData.name || telData.name || '',
        candidateEmail: candidate.email || techData.email || '',
        candidatePhone: candidate.phone || techData.phone || telData.phone || '',
        candidateQualification: candidate.degree || techData.qualification || telData.qualification || '',
        candidateExperience: candidate.experience || techData.overallExperience || telData.overallExperience || '',
        candidateCurrentCompany: techData.currentCompany || telData.currentCompany || '',
        candidateDesignation: techData.currentDesignation || telData.currentDesignation || '',
        candidatePreviousFirm: techData.previousFirm || telData.previousFirm || '',
        candidatePreviousDesignation: techData.previousDesignation || telData.previousDesignation || '',
        candidateLocation: candidate.location || techData.location || telData.address || '',
        candidateNoticePeriod: candidate.joining || techData.noticePeriod || telData.noticePeriod || '',
        candidateExpectedSalary: techData.expectedSalary || telData.expectedSalary || '',
        candidateCurrentSalary: techData.currentSalary || telData.currentSalary || '',
        candidateJobRole: candidate.jobRole || techData.positionAppliedFor || telData.positionAppliedFor || '',
        ...saved,
      });
    } else {
      setFormData(saved);
    }
  }, [candidate, round]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRatingChange = (cat, param, value) => {
    setFormData(prev => {
      const newRatings = {
        ...(prev.ratings || {}),
        [cat]: { ...(prev.ratings?.[cat] || {}), [param]: value }
      };
      
      // Calculate F2F ratings average
      let sum = 0;
      let count = 0;
      Object.values(newRatings).forEach(catRatings => {
        if (catRatings && typeof catRatings === 'object') {
          Object.values(catRatings).forEach(val => {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              sum += num;
              count++;
            }
          });
        }
      });
      const avgScore = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

      return {
        ...prev,
        ratings: newRatings,
        overallScore: avgScore
      };
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    // Calculate F2F ratings average
    const ratings = formData.ratings || {};
    let sum = 0;
    let count = 0;
    Object.values(ratings).forEach(catRatings => {
      if (catRatings && typeof catRatings === 'object') {
        Object.values(catRatings).forEach(val => {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        });
      }
    });
    const avgScore = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
    
    onSave({
      ...formData,
      overallScore: avgScore
    });
  };

  const getTitle = () => {
    switch (round) {
      case 'telephonic': return '📋 Telephonic Assessment Form';
      case 'telephonic_tech': return '🖥️ Telephonic Tech Review';
      case 'f2f': return '🤝 Face to Face HR Assessment';
      case 'negotiation': return '📄 Final Verification & Offer Details';
      default: return 'Evaluation Form';
    }
  };

  // Telephonic Tech: read-only top (filled by candidate), editable bottom (filled by HR)
  const [deptFormData, setDeptFormData] = useState({});

  useEffect(() => {
    if (round === 'telephonic_tech') {
      const saved = candidate?.[`${round}_form`] || {};
      setDeptFormData({
        deptProfessionalExperience: saved.deptProfessionalExperience || '',
        deptProfessionalKnowledge: saved.deptProfessionalKnowledge || '',
        deptRecommended: saved.deptRecommended || '',
        deptRejected: saved.deptRejected || '',
        deptRemarks: saved.deptRemarks || '',
        deptInterviewerName: saved.deptInterviewerName || '',
        deptSignature: saved.deptSignature || '',
      });
    }
  }, [candidate, round]);

  const handleDeptChange = e => {
    const { name, value } = e.target;
    setDeptFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTechSubmit = e => {
    e.preventDefault();
    // Merge deptForm into saved record
    onSave({ ...formData, ...deptFormData });
  };

  // ── Inline rendering (for F2F forms mode in FinalPage) ──────────────────
  if (inline && round === 'f2f') {
    const combinedTelephonicData = {
      name: candidate?.name || '',
      phone: candidate?.phone || '',
      qualification: candidate?.degree || '',
      overallExperience: candidate?.experience || '',
      noticePeriod: candidate?.joining || '',
      location: candidate?.location || '',
      ...(candidate?.telephonic_form || {}),
      ...(candidate?.telephonic_tech_form || {})
    };

    return (
      <div>
        {/* Form 1: Telephonic Assessment */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            background: 'linear-gradient(90deg, #1a3fa6 0%, #2563eb 100%)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            fontWeight: '700',
            fontSize: '13px',
            letterSpacing: '0.5px'
          }}>
            📋 Form 1: Telephonic Assessment (Read-only)
          </div>
          <InterviewAssessmentForm
            formData={combinedTelephonicData}
            readOnly={true}
            hideSection2={true}
          />
        </div>

        {/* Form 2: Department/Technical Assessment */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            fontWeight: '700',
            fontSize: '13px',
            letterSpacing: '0.5px'
          }}>
            🖥️ Form 2: Telephonic / Face to Face Interview by Department (Read-only)
          </div>
          <DeptInterviewForm
            formData={combinedTelephonicData}
            readOnly={true}
          />
        </div>

        {/* F2F Rating Form */}
        <form onSubmit={handleSubmit}>
          <F2FForm formData={formData} onChange={handleChange} onRatingChange={handleRatingChange} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              style={{
                padding: '9px 24px',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                borderRadius: 9,
                background: 'linear-gradient(135deg, #047857, #34d399)',
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: '0 3px 12px rgba(4,120,87,0.25)',
              }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(4,120,87,0.35)'; }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 3px 12px rgba(4,120,87,0.25)'; }}
            >
              💾 Save Form
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, overflowY: 'auto', padding: '20px', alignItems: 'flex-start' }}>
      <div className="modal-content" style={{ maxWidth: '900px', margin: 'auto', maxHeight: 'none', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px' }}>{getTitle()}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
        </div>

        {/* ── TELEPHONIC ROUND ── Full assessment form (editable) */}
        {round === 'telephonic' && (
          <form onSubmit={handleSubmit}>
            <InterviewAssessmentForm formData={formData} onChange={handleChange} readOnly={false} hideSection2={true} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save & Continue</button>
            </div>
          </form>
        )}

        {/* ── TELEPHONIC TECH ── Two forms: pre-filled (top) + empty dept form (bottom) */}
        {round === 'telephonic_tech' && (
          <form onSubmit={handleTechSubmit}>
            {/* Form 1: Full telephonic form pre-filled (read-only) */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                background: 'linear-gradient(90deg, #1a3fa6 0%, #2563eb 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px 6px 0 0',
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '0.5px'
              }}>
                📋 Telephonic Assessment — Filled by Candidate
              </div>
              <InterviewAssessmentForm
                formData={formData}
                onChange={() => {}} // read-only
                readOnly={true}
                hideSection2={true}
              />
            </div>

            {/* Form 2: Section 2 — Empty for HR/Department to fill */}
            <div>
              <div style={{
                background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px 6px 0 0',
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '0.5px'
              }}>
                🖥️ Section 2 — Telephonic / Face to Face Interview by Department (HR fills below)
              </div>
              <DeptInterviewForm formData={deptFormData} onChange={handleDeptChange} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save Evaluation</button>
            </div>
          </form>
        )}

        {/* ── F2F ROUND ── */}
        {round === 'f2f' && (() => {
          const combinedTelephonicData = {
            name: candidate?.name || '',
            phone: candidate?.phone || '',
            qualification: candidate?.degree || '',
            overallExperience: candidate?.experience || '',
            noticePeriod: candidate?.joining || '',
            location: candidate?.location || '',
            ...(candidate?.telephonic_form || {}),
            ...(candidate?.telephonic_tech_form || {})
          };

          return (
            <form onSubmit={handleSubmit}>
              {/* Form 1: Telephonic Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #1a3fa6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  📋 Form 1: Telephonic Assessment (Read-only)
                </div>
                <InterviewAssessmentForm
                  formData={combinedTelephonicData}
                  readOnly={true}
                  hideSection2={true}
                />
              </div>

              {/* Form 2: Department/Technical Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  🖥️ Form 2: Telephonic / Face to Face Interview by Department (Read-only)
                </div>
                <DeptInterviewForm
                  formData={combinedTelephonicData}
                  readOnly={true}
                />
              </div>

              <F2FForm formData={formData} onChange={handleChange} onRatingChange={handleRatingChange} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary">Save Evaluation</button>
              </div>
            </form>
          );
        })()}

        {/* ── FINAL INTERVIEW ROUND ── */}
        {round === 'final_interview' && (
          <form onSubmit={handleSubmit}>
            <FinalInterviewForm
              formData={formData}
              onChange={handleChange}
              candidate={candidate}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save &amp; Continue</button>
            </div>
          </form>
        )}

        {/* ── NEGOTIATION / OFFER LETTER ROUND ── */}
        {round === 'negotiation' && (() => {
          const combinedTelephonicData = {
            name: candidate?.name || '',
            phone: candidate?.phone || '',
            qualification: candidate?.degree || '',
            overallExperience: candidate?.experience || '',
            noticePeriod: candidate?.joining || '',
            location: candidate?.location || '',
            ...(candidate?.telephonic_form || {}),
            ...(candidate?.telephonic_tech_form || {})
          };

          return (
            <form onSubmit={handleSubmit}>
              {/* Form 1: Telephonic Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #1a3fa6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  📋 Form 1: Telephonic Assessment (Read-only)
                </div>
                <InterviewAssessmentForm
                  formData={combinedTelephonicData}
                  readOnly={true}
                  hideSection2={true}
                />
              </div>

              {/* Form 2: Department/Technical Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  🖥️ Form 2: Telephonic / Face to Face Interview by Department (Read-only)
                </div>
                <DeptInterviewForm
                  formData={combinedTelephonicData}
                  readOnly={true}
                />
              </div>

              {/* Form 3: Face to Face HR Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #047857 0%, #10b981 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  🤝 Form 3: Face to Face HR Assessment (Read-only)
                </div>
                <F2FFormReadOnly formData={candidate?.f2f_form || {}} />
              </div>

              {/* Form 4: Final Interview Assessment */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #ea580c 0%, #fb923c 100%)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '0.5px'
                }}>
                  🧑‍💼 Form 4: Final Interview Assessment (Read-only)
                </div>
                <table style={{ ...ds.table, border: '1px solid #333' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #333', padding: '8px', width: '35%' }}>Reviewed by</th>
                      <th style={{ border: '1px solid #333', padding: '8px', width: '20%' }}>Date</th>
                      <th style={{ border: '1px solid #333', padding: '8px' }}>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalRows.map(row => (
                      <tr key={row.key}>
                        <td style={{ border: '1px solid #333', padding: '8px', fontWeight: '600', verticalAlign: 'top' }}>
                          {row.label}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '8px', verticalAlign: 'top' }}>
                          {candidate?.final_interview_form?.[`${row.key}_date`] || '—'}
                        </td>
                        <td style={{ border: '1px solid #333', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                          {candidate?.final_interview_form?.[`${row.key}_assessment`] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <NegotiationForm
                formData={formData}
                onChange={handleChange}
                candidate={candidate}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary">Save &amp; Continue</button>
              </div>
            </form>
          );
        })()}

      </div>
    </div>
  );
}
