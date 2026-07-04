import styles from "../privacy-policy/privacy-policy.module.css";

export const metadata = {
    title: "Terms and Conditions | MyKoott",
    description:
        "Review the Terms and Conditions governing the use of MyKoott by MyKoott Care Pvt. Ltd., including definitions, user obligations, and legal notices.",
    openGraph: {
        title: "Terms and Conditions | MyKoott",
        description:
            "Review the Terms and Conditions governing the use of MyKoott by MyKoott Care Pvt. Ltd., including definitions, user obligations, and legal notices.",
        type: "website",
        url: "https://www.koott.in/terms-and-conditions",
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
        title: "Terms and Conditions | MyKoott",
        description:
            "Review the Terms and Conditions governing the use of MyKoott by MyKoott Care Pvt. Ltd., including definitions, user obligations, and legal notices.",
        images: ["https://www.koott.in/logo.png"],
    },
};

export const dynamic = 'force-static';

export default function TermsAndConditionsPage() {
    return (
        <div className={`bg-white text-gray-900 ${styles.page}`}>
            <div className="max-w-5xl mx-auto px-6 py-16 lg:px-8 lg:py-24">
                <h3 className={`${styles.title} mt-2 text-gray-900`}>
                    Terms and Conditions of Service
                </h3>
                <p className="mt-6 text-base leading-relaxed text-gray-700">
                    PLEASE READ THE FOLLOWING TERMS AND CONDITIONS OF SERVICE (&ldquo;TOS&rdquo;) CAREFULLY BEFORE
                    USING THE WEBSITE.
                </p>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>A. Definitions</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>
                            <strong>Client / You / User:</strong> Any natural person using the Services as defined below. When the User
                            is a minor (below 18 years of age), &ldquo;Client&rdquo; refers to the child and the &ldquo;User&rdquo;
                            refers to the parent or legal guardian acting on their behalf.
                        </li>
                        <li>
                            <strong>Client Data:</strong> Information provided by You at the time of creating a Website user account,
                            including compliance documents (e.g., scanned forms, statutory filings, reports, applications, notices).
                        </li>
                        <li>
                            <strong>Privacy Policy:</strong> The privacy policy available at{" "}
                            <a
                                href="https://www.koott.in/privacy-policy"
                                className="text-indigo-600 underline hover:text-indigo-700"
                            >
                                https://www.koott.in/privacy-policy
                            </a>
                            .
                        </li>
                        <li>
                            <strong>Website:</strong> <span className="font-mono">www.koott.in</span>, a proprietary service platform
                            owned and operated by MyKoott by MyKoott Care Pvt. Ltd.
                        </li>
                        <li>
                            <strong>MyKoott / We / Us / Company:</strong> MyKoott by MyKoott Care Pvt. Ltd., registered at Office
                            101, Vp&rsquo;s Building, Mukkam, Calicut, Kerala, India, 673602, including its authorized employees and
                            affiliates.
                        </li>
                        <li>
                            <strong>Services:</strong> Provision of psychological counseling, behavioural guidance, and emotional
                            wellness support for children and families to address personal, academic, emotional, or developmental
                            challenges. Services exclude counseling for psychotic disorders, crisis intervention for suicidal tendencies,
                            or emergency psychiatric care.
                        </li>
                        <li>
                            <strong>Counselors:</strong> Qualified and verified mental health professionals (psychologists, therapists,
                            counselors) registered on the Website who provide emotional and behavioural support.
                        </li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>B. Interpretation</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>This TOS, along with the Privacy Policy, Refund Policy, and any other Website policies, together form the Agreement.</li>
                        <li>Accessing MyKoott via the mobile application is governed by this Agreement, plus any additional terms imposed by app stores.</li>
                        <li>References to &ldquo;Website&rdquo; also include MyKoott&rsquo;s mobile application.</li>
                        <li>Services under this Agreement are offered within India unless specified otherwise.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>1. The Website</h4>
                    <h5 className="text-gray-900 font-semibold">1.1 Users</h5>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>
                            <strong>Registered Users:</strong> Parents or guardians who register and create an account (with user ID and
                            password) to access Services for themselves or their children.
                        </li>
                        <li>
                            <strong>Non-Registered Users:</strong> Individuals who access general information without registering.
                        </li>
                    </ul>
                    <h5 className="text-gray-900 font-semibold">1.2 Features</h5>
                    <p className="text-base leading-relaxed text-gray-700 font-semibold">For Registered Users</p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Obtain general information and guidance from Counselors.</li>
                        <li>Schedule counseling sessions for children or family members.</li>
                        <li>Interact privately with Counselors via chat, phone, or video.</li>
                        <li>View past consultations and recommendations securely.</li>
                        <li>Pay consultation fees (including MyKoott&rsquo;s handling fee).</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700 font-semibold">For Non-Registered Users</p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Access Counsellor profiles (name, qualifications, expertise, languages, experience).</li>
                        <li>View indicative appointment availability.</li>
                        <li>Access general wellness articles and resources.</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700 font-semibold">For Counselors</p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Publish professional profiles visible to Users.</li>
                        <li>Interact privately with Registered Users via Website features.</li>
                        <li>Receive session fees facilitated through MyKoott.</li>
                        <li>Contribute educational content on child and family mental wellness.</li>
                    </ul>
                    <h5 className="text-gray-900 font-semibold">1.3 Content Types</h5>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>
                            <strong>User Content:</strong> Questions, data, and interactions submitted by Users.
                        </li>
                        <li>
                            <strong>Counselor Content:</strong> Responses, articles, and educational materials from Counselors.
                        </li>
                        <li>
                            <strong>MyKoott Content:</strong> Proprietary content generated or procured by MyKoott.
                        </li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>2. Use of the Site</h4>
                    <h5 className="text-gray-900 font-semibold">2.1 Obligations of All Users</h5>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Use the Website only in compliance with Indian laws, including the POCSO Act, 2012 and the Information Technology Act, 2000.</li>
                        <li>Ensure all information provided is accurate, complete, and not misleading.</li>
                        <li>Do not upload or share content that could harm or exploit children.</li>
                        <li>Do not use automated tools, bots, or scrapers without written consent.</li>
                        <li>Do not copy, sell, or commercially exploit Website materials without authorization.</li>
                        <li>MyKoott reserves the right to restrict access or terminate accounts if misuse or harm is suspected.</li>
                    </ul>
                    <h5 className="text-gray-900 font-semibold">2.2 Registered Users</h5>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Only a parent, legal guardian, or adult caregiver may register and book sessions on behalf of a child below 18.</li>
                        <li>By registering, you confirm that you are legally authorized to provide consent for the child’s participation.</li>
                        <li>MyKoott and its Counselors are not substitutes for emergency or psychiatric medical care.</li>
                        <li>Verify any information received from Counselors independently before taking decisions related to diagnosis or medication.</li>
                        <li>MyKoott facilitates appointments but does not endorse or guarantee the professional advice of Counselors.</li>
                        <li>Fees are payable in advance to MyKoott and are non-transferable except under the Refund Policy.</li>
                    </ul>
                    <h5 className="text-gray-900 font-semibold">2.3 Non-Registered Users</h5>
                    <p className="text-base leading-relaxed text-gray-700">
                        May view Counsellor profiles and general resources but cannot book sessions or access private features.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>3. Role of MyKoott</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott acts as a technology intermediary under the Information Technology Act, 2000. It provides a platform to connect Users with Counselors for child and family mental health support.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott is not liable for clinical outcomes, counsellor performance, or delays beyond its control.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Child Protection Clause:</strong> If a Counsellor or MyKoott staff suspects child abuse, neglect, or risk of harm, MyKoott is legally obligated to report such concerns to appropriate authorities as per Indian child protection laws.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>4. Third-Party Links</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        The Website may contain links to third-party websites. MyKoott does not endorse or control third-party sites. Users visit such sites at their own risk and are bound by third-party terms.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>5. Proprietary Rights</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>All Website design, software, and content belong to MyKoott or its licensors.</li>
                        <li>&ldquo;MyKoott&rdquo; is a registered trademark of MyKoott by MyKoott Care Pvt. Ltd.</li>
                        <li>Users receive a limited, non-commercial, personal-use license.</li>
                        <li>Unauthorized reproduction or derivative works are prohibited.</li>
                        <li>
                            Users retain ownership of their submitted content but grant MyKoott a worldwide, royalty-free, revocable license
                            to use anonymized content for educational or awareness initiatives, respecting child privacy.
                        </li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>6. Personal Information</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott may collect personal and sensitive information about children and parents during registration and sessions.
                        Use of data is governed by the Privacy Policy and Indian data protection laws. Sensitive child data will be handled with
                        strict confidentiality and used only for service delivery. By registering, You consent to such use and acknowledge the Privacy Policy.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>7. Disclaimers</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Counselors are independent professionals; MyKoott does not control their methods or conclusions.</li>
                        <li>MyKoott does not provide medical diagnosis or prescribe medication.</li>
                        <li>Counsellor qualifications and details are self-declared; Users should verify independently.</li>
                        <li>The Website is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;</li>
                        <li>MyKoott disclaims liability for counsellor performance, technical errors, data loss, unauthorized access, or decisions made without medical verification.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>8. Limitation of Liability</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott&rsquo;s liability is limited to the amount paid by the User for Services. MyKoott shall not be liable for indirect, incidental, or consequential damages.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>9. Representations &amp; Warranties</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        By using the Website, You warrant that You are at least 18 years old, authorized to act on behalf of a child client,
                        and will use the Website lawfully and responsibly. You agree not to impersonate others or upload unlawful, obscene, or harmful content.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>10. Indemnification</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        You agree to indemnify and hold harmless MyKoott, its affiliates, employees, Counselors, and service providers from any claims or damages arising from your use of the Website, breach of this Agreement, misrepresentation, negligence, or misconduct.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>11. Termination</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott may suspend or terminate accounts for breach, misuse, or fraudulent activity. Upon termination, all access rights cease immediately. MyKoott may delete stored information in accordance with data retention laws.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>12. Governing Law &amp; Jurisdiction</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        This Agreement is governed by the laws of India. Exclusive jurisdiction lies with the courts of Kerala, India.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>13. Modifications</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott may update these Terms at any time without prior notice. Continued use of the Website constitutes acceptance of updated terms.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>14. Arbitration</h4>
                    <p className="text-base leading-relaxed text-gray-700">
                        Disputes shall be resolved by binding arbitration under the Arbitration and Conciliation Act, 1996, in English, seated in Kerala. A sole arbitrator appointed by MyKoott will oversee proceedings. Either party may seek interim relief from courts.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>15. General Provisions</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li><strong>Severability:</strong> Invalid provisions will not affect remaining terms.</li>
                        <li>
                            <strong>Notices:</strong> To MyKoott: Office 101, Vp&rsquo;s Building, Mukkam, Calicut, Kerala, 673602. To Users: Registered email.
                        </li>
                        <li><strong>Waiver:</strong> Must be written; none implied.</li>
                        <li><strong>Entire Agreement:</strong> This TOS, along with Privacy and Refund Policies, forms the full understanding.</li>
                        <li><strong>Force Majeure:</strong> MyKoott is not liable for delays due to events beyond control.</li>
                        <li><strong>Advertisement:</strong> MyKoott may display advertisements on its platform.</li>
                        <li><strong>Assignment:</strong> Users may not assign rights without MyKoott’s consent.</li>
                        <li><strong>Conflict of Terms:</strong> Precedence — Privacy Policy → TOS → Refund Policy → Other Policies.</li>
                        <li><strong>Complaints:</strong> <a href="mailto:hey@koott.com" className="text-indigo-600 underline hover:text-indigo-700">hey@koott.com</a> or call +91 9539007766.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h4 className={`${styles.sectionHeading} text-gray-900`}>Video Call Process</h4>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>If a video session is scheduled within 1 hour of the appointment, the Google Meet link will be shared at least 5 minutes prior.</li>
                        <li>Video sessions involving minors must be conducted in the presence or with the consent of a parent/guardian.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}

