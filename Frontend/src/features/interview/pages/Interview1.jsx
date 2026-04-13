import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview'

const Interview1 = () => {
    const [activeSection, setActiveSection] = useState('technical')
    const [expandedQuestion, setExpandedQuestion] = useState(0)

    const { report, getReportById, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    // ✅ FIX: always fetch when ID changes
    useEffect(() => {
        if (!interviewId) return
        getReportById(interviewId)
        // eslint-disable-next-line
    }, [interviewId])

    // ✅ Loading state
    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Generating your resume...</h1>
            </main>
        )
    }

    // ✅ No data state
    if (!report) {
        return (
            <main className='loading-screen'>
                <h1>No report found</h1>
            </main>
        )
    }

    const getSectionData = () => {
        if (activeSection === 'technical') return report.technicalQuestions ?? []
        if (activeSection === 'behavioral') return report.behaviouralQuestions ?? []
        if (activeSection === 'roadmap') return report.preparationPlan ?? []
        return []
    }

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#ff6b6b'
            case 'medium': return '#ffa500'
            case 'low': return '#4ade80'
            default: return '#8b8b9f'
        }
    }

    const currentData = getSectionData()

    return (
        <div className="interview">
            <div className="interview-container">

                {/* LEFT SIDEBAR */}
                <aside className="sidebar left-sidebar">
                    <div className="sidebar-header">
                        <div className="match-score">
                            <span className="score-label">Match Score</span>
                            <span className="score-value">{report.matchScore}%</span>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        <button
                            className={`nav-item ${activeSection === 'technical' ? 'active' : ''}`}
                            onClick={() => { setActiveSection('technical'); setExpandedQuestion(0) }}
                        >
                            ❓ Technical Questions
                        </button>

                        <button
                            className={`nav-item ${activeSection === 'behavioral' ? 'active' : ''}`}
                            onClick={() => { setActiveSection('behavioral'); setExpandedQuestion(0) }}
                        >
                            💬 Behavioral Questions
                        </button>

                        <button
                            className={`nav-item ${activeSection === 'roadmap' ? 'active' : ''}`}
                            onClick={() => { setActiveSection('roadmap'); setExpandedQuestion(0) }}
                        >
                            🗺️ Road Map
                        </button>
                    </nav>
                    <button
                        onClick={() => getResumePdf(report._id)}
                        className="button primary-button"
                    >
                        Download Resume
                    </button>
                </aside>

                {/* MAIN CONTENT */}
                <main className="main-content">
                    <div className="content-header">
                        <h2>
                            {activeSection === 'technical' && 'Technical Questions'}
                            {activeSection === 'behavioral' && 'Behavioral Questions'}
                            {activeSection === 'roadmap' && 'Preparation Road Map'}
                        </h2>
                        <p>
                            {activeSection === 'roadmap'
                                ? 'Your personalized preparation schedule'
                                : 'Review and prepare for these questions'}
                        </p>
                    </div>

                    <div className="questions-container">
                        {activeSection === 'roadmap' ? (
                            <div className="roadmap-list">
                                {currentData.map((item, index) => (
                                    <div key={index} className="roadmap-item">
                                        <div className="day-badge">Day {item.day}</div>
                                        <div>
                                            <h3>{item.focus}</h3>
                                            <ul>
                                                {(item.tasks ?? []).map((task, i) => (
                                                    <li key={i}>{task}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="questions-list">
                                {currentData.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`question-card ${expandedQuestion === index ? 'expanded' : ''}`}
                                        onClick={() =>
                                            setExpandedQuestion(expandedQuestion === index ? -1 : index)
                                        }
                                    >
                                        <div className="question-header">
                                            <h3>{item.question}</h3>
                                            <span>
                                                {expandedQuestion === index ? '▼' : '▶'}
                                            </span>
                                        </div>

                                        {expandedQuestion === index && (
                                            <div className="question-details">
                                                <p><strong>Intention:</strong> {item.intention}</p>
                                                <p><strong>Answer:</strong> {item.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* RIGHT SIDEBAR */}
                <aside className="sidebar right-sidebar">
                    <h3>📚 Skill Gaps</h3>

                    <div className="skills-container">
                        {(report.skillgaps ?? []).map((gap, index) => (
                            <div
                                key={index}
                                className="skill-badge"
                                style={{ borderColor: getSeverityColor(gap.severity) }}
                            >
                                {gap.skill}
                            </div>
                        ))}
                    </div>

                    <p>Focus on improving these skills!</p>
                </aside>

            </div>
        </div>
    )
}

export default Interview1