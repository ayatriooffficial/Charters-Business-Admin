import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MAIN_APP_URL } from '../../services/api';

const ApplicationList = () => {
    const { user, applications, refreshApplications, generateRedirectCode } = useAuth();

    useEffect(() => {
        refreshApplications();
    }, [refreshApplications]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const isEmpty = !applications || applications.length === 0;

    return (
        <div className="bg-white">
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-[60px] px-6 bg-background-card rounded-none border border-border">
                    <div className="w-20 h-20 bg-[#f3f4f6] rounded-none flex items-center justify-center mb-6">
                        <svg
                            className="w-10 h-10 text-[#9ca3af]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-text-secondary text-[1.125rem] mb-8 text-center max-w-[500px] leading-relaxed">
                        {user?.role === 'candidate' || user?.role === 'admin'
                            ? `You are officially enrolled in the ${user?.selectedCourse || 'your chosen field'} program. Any formal application tracking will appear here.`
                            : `You haven't applied for your success yet! Your dream career in ${user?.selectedCourse || 'your chosen field'} is just one application away. Let's get started!`
                        }
                    </p>
                    {user?.role !== 'candidate' && user?.role !== 'admin' && (
                        <button
                            onClick={async () => {
                                const code = await generateRedirectCode();
                                if (code) {
                                    window.location.href = `${MAIN_APP_URL}/apply?code=${code}`;
                                } else {
                                    alert("Failed to generate redirection. Please try again.");
                                }
                            }}
                            className="flex items-center gap-2 bg-gradient-to-b from-accent-light to-accent text-white font-bold px-[28px] py-3 rounded-none border-none cursor-pointer text-[15px]"
                        >
                            Apply Now
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-8 px-6">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-[1.25rem] font-extrabold text-text-primary m-0 uppercase tracking-wider">Application Status</h2>
                        <p className="text-text-secondary text-[0.875rem] m-0">
                            You have {applications.length} active application{applications.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {applications.map((application, index) => (
                        <article
                            key={application.applicationNumber || index}
                            className="flex flex-col bg-white border border-border rounded-none overflow-hidden"
                        >
                            <div className="flex flex-col p-6 gap-5">
                                <div className="flex flex-col gap-1 pb-4 border-b border-border">
                                    <h3 className="text-[1.125rem] font-bold text-text-primary m-0">
                                        {application.program || 'Program Not Specified'}
                                    </h3>
                                    <p className="text-[0.75rem] text-text-muted m-0 tracking-wider uppercase">
                                        ID: #{application.applicationNumber}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[0.8125rem] text-text-muted">Program</span>
                                        <span className="text-[0.8125rem] font-semibold text-text-primary text-right">
                                            {application.program || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[0.8125rem] text-text-muted">Submitted On</span>
                                        <span className="text-[0.8125rem] font-semibold text-text-primary">
                                            {formatDate(application.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApplicationList;
