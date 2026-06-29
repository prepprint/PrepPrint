export default function PrivacyPolicy() {
  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-a:text-blue-600">
        
        <h1>Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last Updated: June 2026</p>

        <p>
          Welcome to PrepPrint.in. We respect your privacy and are committed to protecting it through our compliance with this policy. This document explains how we handle your data when you use our PDF optimization utility.
        </p>

        <h2>1. File Handling Pipeline & Data Storage</h2>
        <p>
          PrepPrint.in is designed as a stateless utility. <strong>We do not store, retain, or read the contents of your documents.</strong>
        </p>
        <ul>
          <li><strong>Temporary Processing:</strong> When you upload a PDF, it is temporarily streamed to our servers solely for the purpose of executing the modifications you requested (e.g., color inversion, layout formatting, watermarking).</li>
          <li><strong>Immediate Deletion:</strong> The moment your processed file is compiled and sent back to your browser for download, the temporary data stream is permanently erased from our server memory.</li>
          <li><strong>No Object Storage:</strong> We do not maintain databases or cloud storage buckets containing user-uploaded files.</li>
        </ul>

        <h2>2. Third-Party Advertising & Cookies (Google AdSense)</h2>
        <p>
          To keep this educational utility free for students, we use third-party advertising companies to serve ads when you visit our website.
        </p>
        <ul>
          <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
          <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.</li>
          <li>You may opt out of personalized advertising by visiting <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. Alternatively, you can opt out of some third-party vendors' uses of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.</li>
        </ul>

        <h2>3. Analytics and Log Data</h2>
        <p>
          We may collect basic, anonymous analytical data (such as browser type, operating system, and timestamp) to monitor server performance, optimize routing, and prevent abuse of our API. This data cannot be used to personally identify you.
        </p>

        <h2>4. Contact Us</h2>
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us at:
        </p>
        <p className="font-semibold text-blue-600">
          <a href="mailto:support@prepprint.in">support@prepprint.in</a>
        </p>

      </div>
    </div>
  );
}