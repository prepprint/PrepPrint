export default function TermsOfService() {
  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-a:text-blue-600">
        
        <h1>Terms of Service</h1>
        <p className="text-sm text-slate-500">Last Updated: June 2026</p>

        <p>
          By accessing and using PrepPrint.in, you accept and agree to be bound by the terms and provisions of this agreement.
        </p>

        <h2>1. Acceptable Use</h2>
        <p>
          PrepPrint.in is built as a personal educational utility. It is designed to assist students by formatting study materials to reduce printing costs. You agree not to use the service for any illegal activities, to process malicious code, or to intentionally overload our server infrastructure (e.g., via automated bot uploads).
        </p>

        <h2>2. User Content and Copyright Responsibility</h2>
        <p>
          You retain all rights to the documents you upload. However, <strong>you are solely responsible for ensuring you have the legal right to possess and modify the PDFs you submit</strong>. PrepPrint.in does not monitor, endorse, or assume any liability for the copyright compliance, accuracy, or legality of user-uploaded materials.
        </p>

        <h2>3. Disclaimer of Warranties</h2>
        <p>
          Our services are provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis. 
        </p>
        <ul>
          <li><strong>Processing Accuracy:</strong> While our layout engine is highly optimized, certain complex PDF structures, heavily encrypted files, or non-standard font embeddings may fail to process or render incorrectly.</li>
          <li><strong>Server Uptime:</strong> We strive for high availability, but we do not guarantee 100% server uptime. The service may occasionally be subject to downtime for maintenance, upgrades, or unforeseen infrastructure constraints.</li>
        </ul>

        <h2>4. Limitation of Liability</h2>
        <p>
          In no event shall PrepPrint.in, its developers, or affiliates be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to or use of the service. This includes, but is not limited to, data loss, printing errors, or academic consequences resulting from formatted study materials.
        </p>

        <h2>5. Modifications to the Service</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice, including limiting access to certain features or restricting upload sizes.
        </p>

        <h2>6. Contact Information</h2>
        <p>
          For any questions regarding these Terms of Service or to report abuse, please contact:
        </p>
        <p className="font-semibold text-blue-600">
          <a href="mailto:support@prepprint.in">support@prepprint.in</a>
        </p>

      </div>
    </div>
  );
}