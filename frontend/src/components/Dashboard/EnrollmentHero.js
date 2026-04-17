import React from 'react';
import { RiRocket2Line, RiMagicLine, RiArrowRightLine } from 'react-icons/ri';

const EnrollmentHero = ({ user, onApply }) => {
    const isCandidate = user?.role === 'candidate' || user?.role === 'admin';

    return (
        <section className="bg-black rounded-none py-5 text-white relative overflow-hidden flex items-center min-h-[500px]">
            {/* Background Decorative Elements */}
            <div className="absolute -top-[10%] -right-[5%] w-[300px] height-[300px] bg-accent/10 rounded-full blur-[60px] z-0" />

            <div className="relative z-10 flex justify-between items-center flex-wrap gap-8 px-6">
                <div className="flex-1 min-w-[400px]">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-white/10 px-[14px] py-1.5 rounded-none text-[12px] font-bold tracking-wider uppercase backdrop-blur-sm border border-white/10">
                            {isCandidate ? 'Status: Enrolled' : 'Next Step: Enrollment'}
                        </span>
                    </div>

                    <h1 className="text-[clamp(32px,4vw,42px)] font-extrabold leading-[1.1] mb-5 font-display">
                        {isCandidate 
                            ? <>Congratulations {user?.firstName || 'there'}, your journey in <span className="text-accent-light">{user?.selectedCourse || 'your field'}</span> has officially begun.</>
                            : <>Hey {user?.firstName || 'there'}, your future in <span className="text-accent-light">{user?.selectedCourse || 'your dream field'}</span> starts now.</>
                        }
                    </h1>

                    <p className="text-[18px] opacity-90 leading-relaxed mb-8 max-w-[540px]">
                        {isCandidate 
                            ? `You are now a part of our prestigious ${user?.selectedCourse} program. We're excited to support your professional growth.`
                            : `You've expressed interest in our prestigious ${user?.selectedCourse} program. Begin your application today to lock in priority reviews and early-bird counseling.`
                        }
                    </p>

                    {!isCandidate && (
                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={onApply}
                                className="flex items-center gap-3 bg-gradient-to-b from-accent-light to-accent text-white font-extrabold px-8 py-4 rounded-none border-none cursor-pointer text-base transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02]"
                            >
                                Start Application
                                <RiArrowRightLine className="text-[20px]" />
                            </button>

                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-sm font-bold">
                                    <RiMagicLine className="text-accent-light" />
                                    5-Min Process
                                </div>
                                <div className="text-[12px] opacity-70">Secure & SSO Enabled</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Benefits List Card */}
                <div className="flex-initial w-[300px] bg-white/5 p-8 rounded-none backdrop-blur-[10px] border border-white/10">
                    <h4 className="text-[18px] font-bold mb-5">Why apply today?</h4>
                    <ul className="list-none p-0 m-0 flex flex-col gap-4">
                        <BenefitItem text="Priority Counsellor Match" />
                        <BenefitItem text="Application Fee Waiver" />
                        <BenefitItem text="Early-Bird Scholarships" />
                        <BenefitItem text="Document Pre-verification" />
                    </ul>
                </div>
            </div>
        </section>
    );
};

const BenefitItem = ({ text }) => (
    <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500 }}>
        <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '0', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '10px'
        }}>
            ✓
        </div>
        {text}
    </li>
);

export default EnrollmentHero;
