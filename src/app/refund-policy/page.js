import styles from "./refund-policy.module.css";

export const metadata = {
    title: "Refund & Cancellation Policy | MyKoott",
    description:
        "Review MyKoott by MyKoott Care Pvt. Ltd.'s policies on refunds, cancellations, eligibility, timelines, and liabilities for counselling and wellness services.",
    openGraph: {
        title: "Refund & Cancellation Policy | MyKoott",
        description:
            "Review MyKoott by MyKoott Care Pvt. Ltd.'s policies on refunds, cancellations, eligibility, timelines, and liabilities for counselling and wellness services.",
        type: "website",
        url: "https://www.koott.in/refund-policy",
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
        title: "Refund & Cancellation Policy | MyKoott",
        description:
            "Review MyKoott by MyKoott Care Pvt. Ltd.'s policies on refunds, cancellations, eligibility, timelines, and liabilities for counselling and wellness services.",
        images: ["https://www.koott.in/logo.png"],
    },
};

export const dynamic = 'force-static';

export default function RefundPolicyPage() {
    return (
        <div className={`bg-white text-gray-900 ${styles.page}`}>
            <div className="max-w-5xl mx-auto px-6 py-16 lg:px-8 lg:py-24">
                <h3 className={`${styles.title} mt-2 text-gray-900`}>
                    MyKoott Refund &amp; Cancellation Policy
                </h3>
                <p className="mt-6 text-base leading-relaxed text-gray-700">
                    <strong>Company:</strong> MyKoott by MyKoott Care Pvt. Ltd., a private limited company registered in India.
                </p>
                <p className="text-base leading-relaxed text-gray-700">
                    <strong>Effective Date:</strong> 14/11/2025
                </p>
                <p className="mt-4 text-base leading-relaxed text-gray-700">
                    This Refund &amp; Cancellation Policy (&ldquo;Policy&rdquo;) explains MyKoott by MyKoott Care Pvt. Ltd.&rsquo;s
                    (&ldquo;MyKoott&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo;, &ldquo;Company&rdquo;, &ldquo;Our&rdquo;) approach to refunds, cancellations,
                    timelines, evidence requirements, and limits of liability. MyKoott provides counselling, coaching, and supporting
                    services focused on children, families, and individuals, delivered from India to clients worldwide. This Policy applies
                    to all Registered Users who purchase Services from MyKoott.
                </p>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Definitions</h3>
                    <ul className="space-y-3 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>
                            <strong>Registered User / You / Your:</strong> any individual or entity that has completed MyKoott&rsquo;s registration and paid
                            for Services.
                        </li>
                        <li>
                            <strong>Services:</strong> counseling, coaching, supporting services, training, workshops, and ancillary services provided by
                            MyKoott, delivered online, remotely, synchronously, or asynchronously.
                        </li>
                        <li>
                            <strong>Session:</strong> a single scheduled service interaction (e.g., a 50-minute counseling slot).
                        </li>
                        <li>
                            <strong>Package:</strong> any bundle of Sessions sold for a single fee.
                        </li>
                        <li>
                            <strong>Refund:</strong> monetary reimbursement to the payment instrument or account used to purchase Services, reduced by permitted deductions.
                        </li>
                        <li>
                            <strong>Cut-Off Date:</strong> latest date on which a refund claim may be submitted (normally two (2) days from receipt of the Service).
                        </li>
                        <li>
                            <strong>Payment Processor:</strong> third-party gateway or financial institution that handled the payment.
                        </li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Scope &amp; Applicability</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        This Policy applies to purchases made directly from MyKoott, whether Services are delivered from India or elsewhere. It forms
                        part of the contractual relationship between You and MyKoott and governs eligibility for refunds, cancellations, calculation,
                        timelines, documentation, and liability.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Statutory Rights:</strong> Nothing in this Policy restricts statutory rights available to consumers under applicable laws,
                        including the Consumer Protection Act, 2019 (India), or mandatory consumer rights in other jurisdictions.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Cancellations</h3>
                    <div className="space-y-3">
                        <h4 className={`${styles.subHeading} text-gray-900`}>User-Initiated Cancellations</h4>
                        <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                            <li>Cancel at least 24 hours in advance &rarr; session may be rescheduled without penalty.</li>
                            <li>Cancel less than 24 hours before the session &rarr; session is deemed used and non-refundable.</li>
                            <li>No-shows without notice &rarr; session is deemed used.</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className={`${styles.subHeading} text-gray-900`}>MyKoott-Initiated Cancellations</h4>
                        <p className="text-base leading-relaxed text-gray-700">
                            If MyKoott cancels or the assigned counselor is unavailable, MyKoott will offer rescheduling or an alternate counselor.
                            If rescheduling is not feasible, a refund will apply as per &ldquo;Refund Calculation.&rdquo;
                        </p>
                    </div>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Eligible Refund Events</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Refunds are limited and available only in the following circumstances:
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li><strong>Accounting / Billing Error:</strong> demonstrable incorrect charges such as duplicate transactions.</li>
                        <li><strong>Validated Service Defect:</strong> material, validated deficiency in service quality or delivery attributable to MyKoott.</li>
                        <li><strong>Promised but Undelivered Service:</strong> a specific guaranteed service not delivered and not curable.</li>
                        <li><strong>Statutory or Regulatory Right:</strong> as required by applicable law.</li>
                    </ul>
                    <p className="text-base leading-relaxed text-gray-700">
                        Refunds are not available for subjective dissatisfaction, change of mind, third-party failures outside MyKoott&rsquo;s control, or circumstances not expressly listed above.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Evidence &amp; Investigation</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        To evaluate a claim, MyKoott may require booking or transaction IDs, session logs, payment IDs, screenshots, counselor notes,
                        or other evidence. Users must cooperate with reasonable requests; failure to provide information may result in claim denial.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Cut-Off Dates &amp; Timelines</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>General refund claims: within 2 days from receipt of the Service.</li>
                        <li>First-time ₹699 offer: within 48 hours of the session.</li>
                        <li>Acknowledgement: within 3 working days.</li>
                        <li>Investigation &amp; Decision: within 10 working days of complete documentation.</li>
                        <li>Refund Processing: within 15 working days from approval (bank or processor delays may apply).</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Refund Calculation</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Refunds are based only on unused sessions.
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Per-session rate</strong> = (Total package fee) ÷ (Total sessions)
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Refund</strong> = Package fee − (Used sessions × Per-session rate) − Permitted deductions
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                        <strong>Permitted deductions include:</strong>
                    </p>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>Transaction fees: 2% card transaction fee (reflecting bank or processor charges).</li>
                        <li>Promotional credits or vouchers: proportionally adjusted and not reissued.</li>
                        <li>Taxes: adjusted per law.</li>
                        <li>Set-off: undisputed dues may be deducted.</li>
                        <li>Currency &amp; FX: refunds processed in original currency; FX variations are the User&rsquo;s responsibility.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Remedies &amp; Alternatives</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott may first offer corrective measures such as rescheduling, an alternate counsellor, or an extra session. Partial refunds
                        may apply where only part of the Service failed. At MyKoott&rsquo;s discretion, refunds may be issued as platform credits
                        (valid for 6 months). Credits are non-transferable unless expressly permitted. Users may decline credits and request a cash refund.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Fraud, Abuse &amp; Withholding</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Refunds may be withheld if MyKoott reasonably suspects fraud, collusion, promotional abuse, repeated cancellations, or unauthorized use.
                        Users may be liable for recovery of funds and legal action.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Chargebacks &amp; Payment Disputes</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Unwarranted chargebacks may be contested with evidence. Repeated frivolous chargebacks may lead to account suspension.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>First-Time User Offer (₹699 / 50 minutes)</h3>
                    <ul className="space-y-2 text-base leading-relaxed text-gray-700 list-disc list-inside">
                        <li>One-time offer per unique individual (verified via ID, email, or device).</li>
                        <li>Refund requests allowed within 48 hours of the session.</li>
                        <li>If the user restarts after receiving such a refund, 2 sessions will be debited from the restarted package.</li>
                        <li>MyKoott may withdraw this offer at any time.</li>
                    </ul>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Insurance</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott does not accept or process insurance claims. Users are solely responsible for payment of all fees or reimbursements sought from insurers.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Taxes &amp; Third-Party Fees</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Fees quoted exclude applicable taxes. MyKoott is not responsible for third-party payment processor fees, FX variations, or bank charges beyond the 2% card fee.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Data Retention &amp; Privacy</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott retains refund-related records (transaction logs, communications, recordings) for 24 months or longer if required by law.
                        Processing follows MyKoott&rsquo;s Privacy Policy available at{" "}
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
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Liability for Freelancers &amp; Team</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott is the sole contracting party. In-house and freelance therapists act under MyKoott&rsquo;s authority. Users may not pursue claims directly
                        against individual counselors.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Limitation of Liability</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott&rsquo;s maximum aggregate liability equals the fees paid by You for the specific Services in dispute. MyKoott is not liable for indirect,
                        incidental, or consequential damages (including loss of data or profits). Exclusive remedies include refund, re-performance, or credits.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Indemnity</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Users agree to indemnify MyKoott and its representatives against losses, damages, or costs arising from the User&rsquo;s breach of this Policy,
                        fraud, negligence, or third-party claims.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Force Majeure</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott is not liable for delays or non-performance caused by factors beyond control, including natural disasters, pandemics, strikes, cyberattacks,
                        or payment processor outages.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Governing Law &amp; Dispute Resolution</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        This Policy is governed by the laws of India. Parties shall first attempt amicable resolution within 30 days of written notice. Failing resolution,
                        disputes fall under the exclusive jurisdiction of the courts in Bengaluru, India.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Amendments &amp; Notices</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        MyKoott may amend this Policy from time to time. Material changes will be posted on the website and, where feasible, notified to users. Notices
                        must be sent to{" "}
                        <a
                            href="mailto:hey@koott.com"
                            className="text-indigo-600 underline hover:text-indigo-700"
                        >
                            hey@koott.com
                        </a>
                        .
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Severability &amp; Survival</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        Invalid provisions will not affect enforceability of remaining terms. Sections on refund calculation, liability, indemnity, and governing law survive
                        termination.
                    </p>
                </section>

                <section className="mt-10 space-y-4">
                    <h3 className={`${styles.sectionHeading} text-gray-900`}>Contact</h3>
                    <p className="text-base leading-relaxed text-gray-700">
                        For refunds, cancellations, or grievances, email{" "}
                        <a
                            href="mailto:hey@koott.com"
                            className="text-indigo-600 underline hover:text-indigo-700"
                        >
                            hey@koott.com
                        </a>
                        .
                    </p>
                </section>
            </div>
        </div>
    );
}

