import styles from "./therapy-agreement.module.css";

export const metadata = {
    title: "Therapy Agreement | MyKoott",
    description:
        "Therapy agreement outlining services, expectations, confidentiality, payment, and legal terms for clients of MyKoott by MyKoott Care Pvt. Ltd.",
    openGraph: {
        title: "Therapy Agreement | MyKoott",
        description:
            "Therapy agreement outlining services, expectations, confidentiality, payment, and legal terms for clients of MyKoott by MyKoott Care Pvt. Ltd.",
        type: "website",
        url: "https://www.koott.in/therapy-agreement",
        images: [
            {
                url: "https://www.koott.in/logo.png",
                width: 1200,
                height: 630,
                alt: "MyKoott logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Therapy Agreement | MyKoott",
        description:
            "Therapy agreement outlining services, expectations, confidentiality, payment, and legal terms for clients of MyKoott by MyKoott Care Pvt. Ltd.",
        images: ["https://www.koott.in/logo.png"],
    },
};

export const dynamic = 'force-static';

export default function TherapyAgreementPage() {
    return (
        <div className={`bg-white text-gray-900 ${styles.page}`}>
            <div className="max-w-5xl mx-auto px-6 py-16 lg:px-8 lg:py-24">
                <h3 className={`${styles.title} mt-2 text-gray-900`}>
                    MyKoott Therapy Agreement
                </h3>
                <p className="mt-6 text-base leading-relaxed text-gray-700">
                    This Therapy Agreement outlines expectations, responsibilities, and consent terms for clients engaging
                    with MyKoott by MyKoott Care Pvt. Ltd. Please review it carefully before booking or participating in
                    services.
                </p>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Company &amp; Services</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li><strong>Company:</strong> MyKoott by MyKoott Care Pvt. Ltd.</li>
                        <li>
                            <strong>Services Covered:</strong> Child Counseling, Child Assessment, Better Parenting — delivered
                            exclusively through online/tele-therapy platforms.
                        </li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Nature of Therapy</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Psychological therapy is collaborative and depends on the therapeutic relationship as well as the concerns
                        you bring forward. Therapy is not a one-time consultation; active participation is required during and
                        between sessions. You may be encouraged to practice strategies, reflections, or exercises outside of
                        therapy to support progress.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Appointment Structure &amp; Fees</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Sessions are generally 50 minutes, scheduled weekly, and typically span 4–5 sessions depending on need.</li>
                        <li>Fees are determined by the therapist and must be paid before each session.</li>
                        <li>Professional services outside scheduled sessions (reports, assessments, extended communication) are chargeable.</li>
                        <li>Cancellations or rescheduling require at least 24 hours&rsquo; notice; otherwise, the full session fee applies.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Risks &amp; Benefits</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Therapy may involve exploring sensitive or distressing experiences, which can bring up emotions such as
                        sadness, anger, guilt, or anxiety. This is a normal part of healing. Therapy also offers meaningful
                        benefits, including improved coping skills, emotional balance, healthier relationships, personal growth,
                        and greater overall well-being.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Clinical Records &amp; Reports</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>MyKoott maintains professional clinical records in line with legal and ethical standards.</li>
                        <li>Clients are not automatically entitled to full therapy records.</li>
                        <li>Reports or summaries for educational, medical, or organizational purposes must be formally requested and discussed with the therapist.</li>
                        <li>Additional charges may apply for reports or psychological assessments.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Minor Clients (Under 18 Years)</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>A parent or legal guardian must provide consent for therapy.</li>
                        <li>Parents/guardians have legal access to records but are requested to waive this right to maintain confidentiality.</li>
                        <li>Only general updates are shared with parents unless there is a risk of harm.</li>
                        <li>A treatment summary may be provided at the conclusion of therapy after discussion with the child where appropriate.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Confidentiality</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Communications between client and therapist are confidential except when required by law or ethics, including:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Serious risk of harm to the client or others.</li>
                        <li>Suspected abuse or neglect of a child, elder, or dependent adult.</li>
                        <li>A valid court order mandates disclosure.</li>
                        <li>Professional supervision is needed to improve quality of care (identifying details minimized).</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Suicidality &amp; Crisis</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>MyKoott does not provide 24-hour emergency or crisis intervention.</li>
                        <li>If you are in crisis or experiencing suicidal thoughts, contact local emergency services or visit the nearest hospital immediately.</li>
                        <li>You agree to inform your therapist if experiencing suicidal thoughts or intent.</li>
                        <li>You agree to use emergency or crisis resources when necessary and understand online therapy is not a substitute for emergency care.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Tele-Therapy Considerations</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Ensure sessions take place in a private, quiet setting.</li>
                        <li>Online sessions may face connectivity or security risks, despite MyKoott&rsquo;s secure technology.</li>
                        <li>Technical disruptions may lead to rescheduling or extension of remaining time.</li>
                        <li>Online therapy may not suit severe psychiatric conditions; referrals for in-person care may be recommended.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Couple &amp; Family Therapy</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>The therapist acts as a neutral facilitator and does not guarantee continuation of any relationship.</li>
                        <li>All parties must provide separate informed consent.</li>
                        <li>Disputes regarding therapy should be submitted to MyKoott in writing.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Court Involvement &amp; Legal Proceedings</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>MyKoott and its therapists do not participate in legal disputes.</li>
                        <li>If compelled by subpoena or court order, clients are responsible for all related professional fees, including preparation and travel.</li>
                        <li>A subpoena alone does not permit release of records; valid consent or court order is required.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Payment &amp; Billing</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Fees are communicated before therapy begins.</li>
                        <li>Payment is due before each session via approved methods (UPI, card, bank transfer, etc.).</li>
                        <li>Missed or late-canceled sessions (less than 24 hours&rsquo; notice) are fully chargeable.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Informed Consent &amp; Voluntary Participation</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Participation in therapy is voluntary.</li>
                        <li>You understand the nature, risks, and benefits of therapy.</li>
                        <li>You may discontinue therapy at any time without penalty; discontinuation does not create liability for MyKoott or its therapists.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Data Protection, Privacy &amp; Session Recordings</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Personal data and clinical records are stored securely with restricted access.</li>
                        <li>MyKoott complies with Indian privacy laws and applicable international standards.</li>
                        <li>Sessions are not recorded unless explicit written consent is provided.</li>
                        <li>Clients may not record sessions without written permission from MyKoott.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Communication Outside Sessions</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Therapists are not available for therapy via calls, texts, or emails outside scheduled sessions.</li>
                        <li>Communication outside sessions is limited to scheduling and administrative purposes.</li>
                        <li>Response times may take 24–48 business hours.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Termination of Therapy</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>You may end therapy at any time.</li>
                        <li>Therapists may discontinue therapy if fees remain unpaid, abusive or inappropriate behavior occurs, attendance is inconsistent, or therapy is no longer effective or appropriate.</li>
                        <li>Referral options or recommendations will be provided where possible.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Non-Discrimination &amp; Respect</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott provides inclusive, professional mental health services without discrimination based on
                        religion, caste, gender, marital status, sexual orientation, disability, or background. Mutual respect
                        and cooperation are expected from both client and therapist.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Intellectual Property &amp; Resources</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        All materials shared during therapy, including worksheets, tools, assessments, and guides, remain the
                        intellectual property of MyKoott and are for personal use only. They may not be copied, shared, or
                        distributed without written consent.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Insurance Disclaimer</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott by MyKoott Care Pvt. Ltd. does not accept or process insurance claims. Clients are solely
                        responsible for payment of all fees.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Corporate Clients</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        For corporate wellness services, all individual session details remain strictly confidential. Only
                        anonymized, aggregated data (e.g., number of participants, session topics) may be shared with the
                        organization.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Governing Law &amp; Jurisdiction</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        This Agreement is governed by the laws of India. Any disputes fall under the exclusive jurisdiction of
                        the courts in Calicut, Kerala.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Acknowledgment &amp; Consent</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        By electronically ticking the acceptance box or booking a session, you confirm that you:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Have read and understood this agreement.</li>
                        <li>Enter therapy voluntarily and with informed consent.</li>
                        <li>Acknowledge the risks, benefits, and limitations of therapy.</li>
                        <li>Consent to participate in services provided by MyKoott by MyKoott Care Pvt. Ltd.</li>
                    </ul>
                    <div className="mt-8 space-y-4 text-base leading-relaxed text-gray-700">
                        <p>Client(s) Email for Records: ________________________</p>
                        <p>Signature (Electronic Acceptance): ___________________</p>
                    </div>
                </section>
            </div>
        </div>
    );
}

