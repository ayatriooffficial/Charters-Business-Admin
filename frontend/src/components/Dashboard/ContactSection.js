import React from 'react';
import CounsellorContact from '../Layout/CounsellorContact';

const ContactSection = () => {
  return (
    <div className="flex flex-col gap-0">
      {/* Main Contact Section */}
      <section>
        <CounsellorContact />
      </section>

      {/* Informational Banner */}
      <div className="p-6 bg-black rounded-none text-white flex flex-col gap-3">
          <h3 className="text-[20px] font-extrabold m-0">Helpful Tip</h3>
          <p className="text-[14px] opacity-90 leading-relaxed m-0">
              Before contacting us, make sure to check your <strong>Application Status</strong> for real-time updates on your submissions.
              Many common questions are answered directly in the tracking dashboard below.
          </p>
      </div>
    </div>
  );
};

export default ContactSection;
