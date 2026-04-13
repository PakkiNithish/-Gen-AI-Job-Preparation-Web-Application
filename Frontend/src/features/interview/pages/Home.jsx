import React, { useState, useRef, useEffect } from 'react'
import '../style/home.scss'
import { useInterview } from '../hooks/useInterview'
import { useNavigate } from "react-router"

const Home = () => {

    const { loading, generateReport, reports, getAllReportsList } = useInterview()
    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")
    const [resume, setResume] = useState(null)
    const [dragActive, setDragActive] = useState(false)

    const resumeInputRef = useRef()
    const navigate = useNavigate()

    useEffect(() => {
        getAllReportsList()
    }, [])

    const handleGenerateReport = async () => {
        try {
            if (!jobDescription.trim()) {
                alert("Job description is required")
                return
            }

            if (!resume && !selfDescription.trim()) {
                alert("Please upload a resume or provide a self description")
                return
            }

            const resp = await generateReport({
                jobDescription,
                selfDescription,
                resumeFile: resume
            })

            navigate(`/interview/${resp.interviewReport._id}`)
        } catch (err) {
            alert("Failed to generate interview report. Please try again.")
        }
    }

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setResume(e.dataTransfer.files[0])
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setResume(e.target.files[0])
        }
    }

    const handleUploadAreaClick = () => {
        resumeInputRef.current.click()
    }

    return (
        <main className='home'>
            <div className="container">
                <header className="header">
                    <h1>
                        Create Your Custom <span className='highlight'>Interview Plan</span>
                    </h1>
                    <p>
                        Let our AI analyze the job requirements and your unique profile to build a winning strategy.
                    </p>
                </header>

                <div className="interview-input-group">
                    {/* LEFT SECTION */}
                    <div className="section left-section">
                        <div className="section-header">
                            <span className="icon">📌</span>
                            <label>Target Job Description</label>
                            <span className="badge">REQUIRED</span>
                        </div>

                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job description here..."
                        />

                        <div className="char-count">
                            {jobDescription.length} / 5000 chars
                        </div>
                    </div>

                    {/* RIGHT SECTION */}
                    <div className="section right-section">
                        <div className="section-header">
                            <span className="icon">👤</span>
                            <label>Your Profile</label>
                        </div>

                        {/* FILE UPLOAD */}
                        <div className="input-group">
                            <div className="input-label">
                                Upload Resume
                                <span className="badge small">BEST RESULTS</span>
                            </div>

                            <div
                                className={`file-upload-area ${dragActive ? 'active' : ''} ${resume ? 'has-file' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={handleUploadAreaClick}
                            >
                                {resume ? (
                                    <div className="file-info">
                                        <span className="file-icon">📄</span>
                                        <p>{resume.name}</p>
                                    </div>
                                ) : (
                                    <>
                                        <span className="upload-icon">☁️</span>
                                        <p>Click to upload or drag & drop</p>
                                        <p>PDF or DOCX (Max 5MB)</p>
                                    </>
                                )}

                                <input
                                    ref={resumeInputRef}
                                    type="file"
                                    accept=".pdf,.docx"
                                    onChange={handleFileChange}
                                    hidden
                                />
                            </div>
                        </div>

                        <div className="divider">OR</div>

                        {/* SELF DESCRIPTION */}
                        <div className="input-group">
                            <label htmlFor="selfDescription">
                                Quick Self-Description
                            </label>

                            <textarea
                                value={selfDescription}
                                onChange={(e) => setSelfDescription(e.target.value)}
                                placeholder="Describe your experience..."
                            />
                        </div>
                    </div>
                </div>

                {/* RECENT REPORTS */}
                {reports.length > 0 && (
                    <section className="recent-reports">
                        <h2>🕒 Your Recent Interview Plans</h2>

                        <ul className="reports-list">
                            {reports.map((r) => (
                                <li
                                    key={r._id}
                                    className="report-item"
                                    onClick={() => navigate(`/interview/${r._id}`)}
                                >
                                    <div>
                                        <h3>{r.title || "Untitled Plan"}</h3>
                                        <p>{new Date(r.createdAt).toLocaleString()}</p>
                                        <p className="match-score">Match Score: {r.matchScore}%</p>
                                    </div>
                                    <span>➡️</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* FOOTER */}
                <footer className="footer">
                    <p>⚡ AI-Powered Strategy Generation - Approx 30s</p>

                    <button
                        onClick={handleGenerateReport}
                        className="button primary-button"
                    >
                        ⭐ Generate My Interview Strategy
                    </button>
                </footer>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-modal">
                        <div className="spinner"></div>
                        <h2>Generating Your Interview Strategy</h2>
                        <p>Analyzing your profile...</p>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home