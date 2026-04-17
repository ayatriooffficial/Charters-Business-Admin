import React from 'react';
import { Link } from 'react-router-dom';
import { RiMailLine, RiPhoneLine, RiTimeLine, RiMapPinUserLine } from 'react-icons/ri';
import Card from '../Common/Card';

const COUNSELLORS = [
  {
    id: 1,
    name: "Alex Thompson",
    role: "Senior Admissions Counsellor",
    email: "alex.t@chartersbusiness.com",
    phone: "+1 234 567 8900",
    availability: "Mon - Fri, 9AM - 6PM",
    specialization: ["MBA", "Business Analytics"],
    languages: ["English", "Spanish"]
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "International Student Advisor",
    email: "s.chen@chartersbusiness.com",
    phone: "+1 234 567 8901",
    availability: "Mon - Fri, 10AM - 7PM",
    specialization: ["Undergraduate", "Visa Support"],
    languages: ["English", "Mandarin"]
  },
  {
    id: 3,
    name: "Michael Roberts",
    role: "Postgraduate Program Specialist",
    email: "m.roberts@chartersbusiness.com",
    phone: "+1 234 567 8902",
    availability: "Mon - Fri, 8AM - 5PM",
    specialization: ["Executive Education", "Doctoral Programs"],
    languages: ["English", "French"]
  }
];

export default function CounsellorContact() {
  return (
    <div className="w-full pt-12 pb-0 bg-white">
      <header className="mb-10 px-6">
        <h2 className="text-[28px] font-extrabold text-text-primary mb-2">
          Expert Guidance Just a Click Away
        </h2>
        <p className="text-text-secondary text-base">
          Our certified admissions counsellors are dedicated to helping you find the perfect program.
        </p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-0 border border-border border-r-0">
        {COUNSELLORS.map((counsellor) => (
          <Card 
            key={counsellor.id} 
            padding="0" 
            className="rounded-none border-none border-r border-border shadow-none bg-white"
          >
            <div className="p-6 border-b border-border">
              <div className="flex gap-5 items-center">
                <div className="w-16 h-16 rounded-none bg-background-hover flex items-center justify-center text-accent">
                  <RiMapPinUserLine size={32} />
                </div>
                <div>
                  <h3 className="text-[18px] font-extrabold text-text-primary m-0">
                    {counsellor.name}
                  </h3>
                  <p className="text-[13px] font-semibold text-accent mt-1">
                    {counsellor.role}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <ContactItem icon={RiMailLine} label="Email" value={counsellor.email} href={`mailto:${counsellor.email}`} />
              <ContactItem icon={RiPhoneLine} label="Phone" value={counsellor.phone} href={`tel:${counsellor.phone.replace(/\s/g, '')}`} />
              <ContactItem icon={RiTimeLine} label="Availability" value={counsellor.availability} />

              <div className="mt-2 flex gap-3">
                <a
                  href={`mailto:${counsellor.email}?subject=Application Inquiry`}
                  className="flex-1 text-center p-3 rounded-none bg-accent text-white no-underline font-bold text-sm shadow-none transition-transform duration-200"
                >
                  Send Email
                </a>
                <a
                  href={`tel:${counsellor.phone.replace(/\s/g, '')}`}
                  className="flex-1 text-center p-3 rounded-none border border-border bg-white text-text-primary no-underline font-bold text-sm transition-colors duration-200"
                >
                  Call Now
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <footer className="p-8 rounded-none bg-background-hover text-center border border-border">
        <p className="text-[15px] text-text-primary font-semibold mb-2">
          General Enquiries & Support
        </p>
        <a 
          href="mailto:support@chartersbusiness.com" 
          className="text-[18px] font-extrabold text-accent no-underline"
        >
          support@chartersbusiness.com
        </a>
        <p className="text-[12px] text-text-muted mt-3">
          Our team usually responds within 24 hours during business days.
        </p>
      </footer>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, href }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Icon size={18} style={{ color: 'var(--text-muted)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: href ? 'var(--accent)' : 'var(--text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  );

  return href ? (
    <a href={href} style={{ textDecoration: 'none' }}>{content}</a>
  ) : content;
}