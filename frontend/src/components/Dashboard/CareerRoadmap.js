import React, { useEffect, useMemo } from 'react';
import { RiCheckLine, RiEdit2Line, RiChatVoiceLine, RiAwardLine } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { MAIN_APP_URL } from '../../services/api';

const CareerRoadmap = () => {
    const { 
        user,
        applications, 
        counselings, 
        refreshApplications, 
        refreshCounselings, 
        generateRedirectCode 
    } = useAuth();

    useEffect(() => {
        refreshApplications();
        refreshCounselings();
    }, [refreshApplications, refreshCounselings]);

    // Calculate dynamic state based on real data
    const roadmapState = useMemo(() => {
        const isEnrolled = user?.role === 'candidate' || user?.role === 'admin';
        const hasApplication = (applications || []).length > 0 || isEnrolled;
        const hasCounseling = (counselings || []).length > 0 || isEnrolled;

        // Step 1: Goal Set (Always Complete)
        // Step 2: Application (Complete if hasApplication)
        // Step 3: Counseling (Complete if hasCounseling, Active if hasApplication && !hasCounseling)
        // Step 4: Success (Active if hasCounseling)

        let currentStep = 1;
        if (isEnrolled) {
            currentStep = 4;
        } else if (!hasApplication) {
            currentStep = 2; // Needs to apply
        } else if (!hasCounseling) {
            currentStep = 3; // Needs to book counseling
        } else {
            currentStep = 4; // All set!
        }

        const steps = [
            { 
                id: 1, 
                label: 'Goal Set', 
                icon: RiCheckLine, 
                status: 'completed', 
                description: 'Interested course selected' 
            },
            { 
                id: 2, 
                label: 'Application', 
                icon: RiEdit2Line, 
                status: (hasApplication || isEnrolled) ? 'completed' : (currentStep === 2 ? 'active' : 'upcoming'), 
                description: 'Begin your enrollment' 
            },
            { 
                id: 3, 
                label: 'Counseling', 
                icon: RiChatVoiceLine, 
                status: (hasCounseling || isEnrolled) ? 'completed' : (currentStep === 3 ? 'active' : 'upcoming'), 
                description: 'Connect with experts' 
            },
            { 
                id: 4, 
                label: 'Success', 
                icon: RiAwardLine, 
                status: currentStep === 4 ? (isEnrolled ? 'completed' : 'active') : 'upcoming', 
                description: isEnrolled ? 'Enrollment Confirmed' : 'Official enrollment' 
            },
        ];

        return { steps, currentStep, isEnrolled };
    }, [applications, counselings, user]);

    const { steps, currentStep } = roadmapState;

    const handleNextStep = async () => {
        const code = await generateRedirectCode();
        if (!code) {
            alert("Redirection failed. Please try again.");
            return;
        }

        let path = '/apply';
        if (currentStep === 3) {
            path = '/apply?type=counseling'; // Assuming this triggers counseling booking
        } else if (currentStep === 4) {
            path = '/'; // Go to main dashboard
        }

        window.location.href = `${MAIN_APP_URL}${path}${path.includes('?') ? '&' : '?'}code=${code}`;
    };

    return (
        <section className="bg-white rounded-none py-12 border-none">
            <header className="mb-12 text-left px-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-1 bg-accent" />
                    <h3 className="text-[14px] font-extrabold text-accent uppercase tracking-[0.2em]">The Journey</h3>
                </div>
                <h2 className="text-[28px] font-extrabold text-navy m-0 font-display leading-tight">
                    Tracking Your Path to Success
                </h2>
            </header>

            <div className="px-6">
                {/* Horizontal Progress Track */}
                <div className="relative flex justify-between gap-0">
                    {/* Background Track Line */}
                    <div className="absolute top-[28px] left-0 right-0 h-1 bg-[#f1f5f9] z-0" />
                    
                    {/* Active Track Overlay (Fills based on progress) */}
                    <div 
                        className="absolute top-[28px] left-0 h-1 bg-green z-[5] transition-all duration-500" 
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((step) => (
                        <div 
                            key={step.id} 
                            className="flex-1 flex flex-col items-center z-10 relative group"
                        >
                            {/* Step Indicator */}
                            <div className={`
                                w-14 h-14 rounded-none flex items-center justify-center text-[22px] mb-4 transition-all duration-300 border-2
                                ${step.status === 'completed' 
                                    ? 'bg-green border-green text-white' 
                                    : step.status === 'active' 
                                        ? 'bg-accent border-accent text-white scale-110' 
                                        : 'bg-white border-[#f1f5f9] text-text-muted'}
                            `}>
                                {step.status === 'completed' ? <RiCheckLine /> : <step.icon />}
                            </div>

                            {/* Label & Description */}
                            <div className="text-center px-2">
                                <div className={`
                                    text-[15px] font-extrabold mb-1 uppercase tracking-wider
                                    ${step.status === 'upcoming' ? 'text-text-muted' : 'text-navy'}
                                `}>
                                    {step.label}
                                </div>
                                <p className={`
                                    text-[12px] m-0 max-w-[140px] leading-relaxed
                                    ${step.status === 'active' ? 'text-text-secondary font-medium' : 'text-text-muted'}
                                `}>
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dynamic Focus Highlight */}
            <div className="mt-12 mx-6 p-6 bg-surface-tint border-l-4 border-accent flex justify-between items-center flex-wrap gap-4">
               <div className="flex-1 min-w-[300px]">
                  <span className="text-[11px] font-bold text-accent uppercase tracking-widest block mb-1">Current Focus</span>
                  <p className="text-[16px] text-navy font-bold m-0">
                    {currentStep === 4 
                        ? "You are all set! Your enrollment journey is complete." 
                        : `Step ${currentStep}: ${steps.find(s => s.id === currentStep)?.description}`}
                  </p>
               </div>
               {currentStep < 4 && (
                   <button 
                        onClick={handleNextStep}
                        className="bg-navy text-white hover:bg-navy-soft px-8 py-4 font-extrabold text-sm transition-all duration-200 transform active:scale-95"
                    >
                        {currentStep === 2 ? "Start Application" : "Book Counseling"}
                   </button>
               )}
            </div>
        </section>
    );
};

export default CareerRoadmap;
