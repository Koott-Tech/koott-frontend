import styles from "./privacy-policy.module.css";

export const metadata = {
    title: "Privacy Policy | Koott",
    description:
        "Understand how Koott by Koott Care Pvt. Ltd. collects, uses, and protects personal information for children and families.",
    openGraph: {
        title: "Privacy Policy | Koott",
        description:
            "Understand how Koott by Koott Care Pvt. Ltd. collects, uses, and protects personal information for children and families.",
        type: "website",
        url: "https://www.koott.in/privacy-policy",
        images: [
            {
                url: "https://www.koott.in/favicon.png",
                width: 1200,
                height: 630,
                alt: "Koott logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Privacy Policy | Koott",
        description:
            "Understand how Koott by Koott Care Pvt. Ltd. collects, uses, and protects personal information for children and families.",
        images: ["https://www.koott.in/favicon.png"],
    },
};

export const dynamic = 'force-static';

export default function PrivacyPolicyPage() {
    return (
        <div className={`bg-white text-gray-900 ${styles.page}`}>
            <div className="max-w-5xl mx-auto px-6 py-16 lg:px-8 lg:py-24">
                <h3 className={`${styles.title} mt-2 text-gray-900`}>
                    Koott Privacy Policy
                </h3>
                <p className="mt-6 text-base leading-relaxed text-gray-700">
                    Koott by Koott Care Pvt. Ltd. (&ldquo;Koott&rdquo;) is the owner and operator of{" "}
                    <a
                        href="https://www.koott.in"
                        className="text-indigo-600 underline hover:text-indigo-700"
                    >
                        https://www.koott.in
                    </a>
                    . Koott is committed to protecting your privacy and ensuring the safety of all individuals who
                    use our platform and services, especially children and families.
                </p>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>A. Objective</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        This policy (&ldquo;Privacy Policy&rdquo;) outlines Koott&rsquo;s practices for its website
                        and subscriber-based services (&ldquo;Services&rdquo;), including the type of information
                        collected, the method of such collection, how such information is used, and under what
                        circumstances it may be shared with third parties. As a children&rsquo;s mental health and
                        wellness platform, Koott gives special importance to data protection, parental consent, and
                        the responsible handling of information related to minors. This document constitutes
                        Koott&rsquo;s Privacy Policy and is accessible at{" "}
                        <a
                            href="https://www.koott.in"
                            className="text-indigo-600 underline hover:text-indigo-700"
                        >
                            https://www.koott.in
                        </a>
                        .
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>B. Definitions</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Sensitive Personal Data or Information (SPDI)</strong> includes Personal Information
                        consisting of:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Password;</li>
                        <li>Financial information such as bank account, credit card, debit card, or other payment instrument details;</li>
                        <li>Physical, physiological, and mental health condition;</li>
                        <li>Sexual orientation;</li>
                        <li>Medical records and history;</li>
                        <li>Biometric information;</li>
                        <li>Any detail relating to the above provided by an individual to Koott for providing Services;</li>
                        <li>Any of the above information received by Koott under a lawful contract or otherwise.</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Exclusion:</strong> Information that is freely available in the public domain, or furnished under the Right
                        to Information Act, 2005, or under any other applicable law, shall not be regarded as SPDI.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Personal Information</strong> means any information relating to a natural person that, directly or
                        indirectly, in combination with other information available or likely to be available with
                        Koott, is capable of identifying such person.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        Any person, including Koott and its representatives, who collects, receives, stores,
                        processes, or handles SPDI or Personal Information shall be governed by this Privacy Policy.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>C. Privacy Principles</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott&rsquo;s Privacy Policy is guided by principles of transparency, lawful purpose,
                        necessity, accountability, and security in handling Personal Information and SPDI, particularly
                        in relation to data involving minors.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>D. Consent</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>By using our website or Services, you consent to Koott&rsquo;s collection and processing of your Personal Information.</li>
                        <li>If SPDI is required, Koott shall seek your express consent before collection.</li>
                        <li>Clicking on the &ldquo;I Accept&rdquo; tick box on the website constitutes valid consent.</li>
                        <li>By accepting this Privacy Policy, you represent that you are at least 18 years of age.</li>
                        <li>If you are under 18 years, a parent or legal guardian must provide consent and act on your behalf.</li>
                        <li>If you choose not to provide required information, Koott may be unable to deliver Services or personalize your experience.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>E. Information We Collect</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott may collect Personal Information and SPDI where reasonable and necessary, including:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>
                            <strong>Information you provide:</strong> Name, age, gender, contact details, email address,
                            address, financial details, health or emotional wellness records, or other information
                            voluntarily shared with Koott.
                        </li>
                        <li>
                            <strong>Information from use of Services:</strong> Device details, IP address, browser type,
                            operating system, location data, activity logs, passwords used within Services.
                        </li>
                        <li>
                            <strong>Other identifiable information:</strong> Any other information capable of identifying you or your child.
                        </li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        Information may be collected when you register or create an account; subscribe to Services or newsletters;
                        participate in wellness sessions, assessments, or surveys; provide health-related documents or feedback; communicate
                        with Koott via email, phone, or chat; or access interactive or child-oriented features on the platform.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott also collects aggregated, non-personal usage data (cookies, analytics, etc.) to improve service quality
                        and user experience.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>F. Use of Information</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott collects and uses Personal Information and SPDI for the following purposes:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>To deliver, personalize, and improve our Services;</li>
                        <li>To support families and children with mental health and wellness programs;</li>
                        <li>For research, analytics, and awareness-building (only in anonymized form);</li>
                        <li>For customer support, training, and quality assurance;</li>
                        <li>For legal, regulatory, and compliance requirements;</li>
                        <li>For business continuity and security purposes.</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott shall use data only for lawful and legitimate purposes, inform users of data use and obtain consent where required,
                        retain records only as long as legally necessary, and securely dispose of data after retention.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>G. Sharing of Information</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott shall not publish, trade, or disclose your SPDI or Personal Information without consent, except:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>With affiliates, trusted partners, or service providers who assist in delivering our Services and are bound by confidentiality;</li>
                        <li>With healthcare professionals, counselors, or wellness experts associated with Koott (with consent and in compliance with this Policy);</li>
                        <li>With government or law enforcement agencies when required by applicable law.</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott ensures that all third parties receiving data maintain the same level of protection as required under Indian law.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>H. Withdrawal of Consent</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        You may withdraw consent for collection, storage, or use of your SPDI or Personal Information at any time by writing to
                        the Grievance Officer (details below). Withdrawal may affect Koott&rsquo;s ability to provide certain Services,
                        especially those requiring personalized support.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>I. Accuracy and Updates</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        You are responsible for providing accurate and updated information. Requests for updates or corrections can be sent to{" "}
                        <a
                            href="mailto:hello@koott.in"
                            className="text-indigo-600 underline hover:text-indigo-700"
                        >
                            hey@koott.com
                        </a>
                        . Verification may be required for security purposes. Koott shall update its records upon request but is not
                        responsible for the authenticity of user-provided data.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>J. Retention of Information</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott by Koott Care Pvt. Ltd. shall retain information only as long as necessary or legally required and securely
                        dispose of information after the retention period expires.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>K. User Rights</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Users have the right to:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Access information held about them;</li>
                        <li>Request correction of inaccurate or incomplete data;</li>
                        <li>Withdraw consent or opt out of communications;</li>
                        <li>Restrict processing of their information in certain cases;</li>
                        <li>Have grievances addressed promptly.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>L. Security Practices</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott maintains appropriate technical and organizational measures to safeguard data, including encryption and secure
                        data transmission, role-based access controls, staff confidentiality training and non-disclosure agreements, regular
                        security reviews and audits, and restricted access to authorized personnel only.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>M. Cross-Border Transfers</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        If Personal Information is transferred outside India, Koott ensures that equivalent data protection measures are
                        maintained in the receiving jurisdiction. While we use secure channels, transmission of data over the Internet carries
                        inherent risks, and Koott cannot guarantee absolute security.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>N. Force Majeure</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Koott shall not be liable for loss, damage, or misuse of information arising from events beyond its reasonable
                        control (&ldquo;Force Majeure&rdquo;), including natural disasters, cyberattacks, government actions, strikes, riots, or
                        system failures.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>O. Grievance Officer</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        As required by the Information Technology Act, 2000, and applicable rules, the details of Koott&rsquo;s Grievance
                        Officer are:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Ms. Athullya O</li>
                        <li>Grievance Officer, Koott by Koott Care Pvt. Ltd.</li>
                        <li>
                            Email:{" "}
                            <a
                                href="mailto:hey@koott.com"
                                className="text-indigo-600 underline hover:text-indigo-700"
                            >
                                hey@koott.com
                            </a>
                        </li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        Only communications addressed to this official email will be treated as valid for Privacy Policy purposes.
                    </p>
                </section>

               <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>P. Legal Effect</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        This document is an electronic record under the Information Technology Act, 2000. It does not require physical or digital
                        signatures.
                    </p>
                </section>
            </div>
        </div>
    );
}

