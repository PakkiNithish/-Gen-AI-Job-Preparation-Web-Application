import { getAllInterviewReports, getInterviewReportById, generateInterviewReport, generateResumePdf} from '../services/interview.api'
import { useContext } from 'react'
import { InterviewContext } from '../interview.context'

export const useInterview = () => {
    const context = useContext(InterviewContext)
    if(!context){
        throw new Error("useInterview must be used within an InterviewProvider")
    }
    const { loading, setLoading, report, setReport, reports, setReports } = context
    
    const generateReport = async ({jobDescription, selfDescription, resumeFile}) => {
    setLoading(true)
    try {
        const resp = await generateInterviewReport({jobDescription, selfDescription, resumeFile});
        setReport(resp.interviewReport)  // ✅ extract interviewReport, not the whole response
        return resp;
    } catch(error) {
        console.error("Error generating interview report:", error);
        throw error;
    } finally {
        setLoading(false)
    }
}
    const getReportById = async (id) => {
        setLoading(true)
        try{
            const resp = await getInterviewReportById(id);
            setReport(resp.interviewReport)
        }catch(error){
            console.error("Error fetching interview report by ID:", error);
        }finally{
            setLoading(false)
        }
    }
    const getAllReportsList = async () => {
        setLoading(true)
        try{
            const resp = await getAllInterviewReports();
            setReports(resp.interviewReports)
        }catch(error){
            console.error("Error fetching all interview reports:", error);
        }finally{
            setLoading(false)
        }
    }
    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        let response = null
        try {
            response = await generateResumePdf(interviewReportId)
            const url = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.parentNode.removeChild(link)
        } catch (error) {
            console.error("Error generating resume PDF:", error)
            throw error
        } finally {
            setLoading(false)
        }
    }
    return { loading, report, reports, generateReport, getReportById, getAllReportsList, getResumePdf }
}