import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="container min-w-0 max-w-3xl space-y-8 py-8 wrap-anywhere text-sm leading-7 text-(--text-secondary) sm:py-10 sm:text-base [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-(--text-primary) [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-(--interactive-primary) [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-(--border-default) [&_a:hover]:decoration-current [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-(--text-primary) sm:text-3xl">隱私權政策</h1>
        <p className="text-sm text-(--text-muted)">最後更新：<time dateTime="2026-09-14">2026/09/14</time></p>
        <p>這裡說明網站與社團服務需要哪些資料、如何使用，以及您可以如何查詢或提出請求。</p>
      </header>
      <nav aria-label="本頁內容" className="border-y border-(--border-default) py-4">
        <p className="mb-2 text-sm font-medium text-(--text-primary)">本頁內容</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <a className="inline-flex min-h-9 items-center" href="#data">我們蒐集哪些資料</a>
          <a className="inline-flex min-h-9 items-center" href="#purpose">使用目的與不提供資料的影響</a>
          <a className="inline-flex min-h-9 items-center" href="#providers">第三方服務</a>
          <a className="inline-flex min-h-9 items-center" href="#embeds">外部圖片、連結與嵌入影音</a>
          <a className="inline-flex min-h-9 items-center" href="#retention">資料保存</a>
          <a className="inline-flex min-h-9 items-center" href="#rights">您的個資權利</a>
          <a className="inline-flex min-h-9 items-center" href="#contact">聯絡方式</a>
        </div>
      </nav>
      <div className="space-y-8">
        <section id="scope" aria-labelledby="scope-title" className="scroll-mt-24 space-y-3">
          <h2 id="scope-title">1. 適用範圍</h2>
          <p>本政策說明國立臺灣科技大學桌上遊戲研究社（以下稱本社團）維運本網站時，如何處理網站帳號與社團管理服務中的個人資料。公開公告與桌遊資訊可直接瀏覽；需要身分辨識的服務則須登入並符合該功能要求。</p>
          <p>本政策是資料處理方式的說明，不代表您放棄個資權利，也不因單純瀏覽就授權所有用途。外部網站及影音平台另有各自政策。</p>
        </section>

        <section id="data" aria-labelledby="data-title" className="scroll-mt-24 space-y-3">
          <h2 id="data-title">2. 我們蒐集哪些資料</h2>
          <ul>
            <li>帳號資料：註冊必填的顯示名稱、Email 與密碼，以及帳號識別碼、Email 驗證狀態、建立與更新時間。密碼經雜湊後儲存，不保存明文密碼。</li>
            <li>個人資料：目前註冊須填寫真實姓名與電話；學號、學校、系所、年級及頭像網址為選填。頭像以您提供的圖片網址顯示。</li>
            <li>社員與幹部紀錄：所屬學年度、一般社員／終生社員類型、資格狀態、加入時間、啟用碼及其認領關聯，以及幹部職稱與學年度紀錄。</li>
            <li>借用與活動紀錄：借用人、桌遊、申請與處理狀態、審核者、申請／借出／預計歸還／實際歸還時間；活動參與者、出席狀態與簽到時間。</li>
            <li>Email 驗證資料：驗證碼的雜湊值、所屬帳號、建立與到期時間，以及已使用或失效的標記。驗證連結中的原始碼不存入本網站的驗證資料表。</li>
            <li>登入與系統紀錄：登入 Session、建立／最近使用／到期時間，以及必要的錯誤追蹤碼與技術紀錄。網站及基礎設施也可能處理連線 IP、請求時間與瀏覽器等網路資訊。</li>
          </ul>
          <p>資料主要由您填寫、使用功能時產生，或由獲授權幹部依社團作業建立及維護，例如社員登錄、借用確認與出席紀錄。</p>
        </section>

        <section id="purpose" aria-labelledby="purpose-title" className="scroll-mt-24 space-y-3">
          <h2 id="purpose-title">3. 使用目的與不提供資料的影響</h2>
          <p>資料用於建立與維護帳號、登入與 Email 驗證、社員資格及幹部紀錄管理、桌遊借用與歸還聯繫、活動簽到，以及必要的安全維護與系統除錯。</p>
          <p>您可選擇不提供資料；未提供註冊必填資料或無法完成安全驗證時，無法建立帳號。未完成 Email 驗證會限制需要驗證身分的操作。選填資料不填不會阻止註冊，但幹部可能需要再與您確認相關社團資料。</p>
          <p>我們在上述特定目的及必要範圍內處理資料，不任意轉作無關用途，也不出售或出租個人資料作行銷。若有目的外利用，須有適用法律允許的依據；需要同意時，另依規定取得。</p>
        </section>

        <section id="use" aria-labelledby="use-title" className="scroll-mt-24 space-y-3">
          <h2 id="use-title">4. 利用方式、對象與地區</h2>
          <p>資料透過網站及資料庫的電子方式處理，由本社團獲授權的幹部、維運人員與提供必要服務的受託廠商，在其職務或服務範圍內使用。</p>
          <p>公開個人頁面以帳號識別碼作為網址，供任何訪客查看您的顯示名稱與頭像，社員／幹部身份標籤，以及累積借用次數、本學年簽到次數與加入社團學年度摘要；您可於帳號設定修改這兩項資料。Email、驗證狀態、真實姓名、電話、學籍，原始社員資格紀錄、借用桌遊與日期等明細，以及簽到活動與時間等明細不會出現在公開個人頁面。註銷後保留相同網址，僅顯示「已註銷使用者」與預設頭像。</p>
          <p>本社團在臺灣使用這些資料；使用下述雲端、寄信及媒體服務時，資料也可能於服務商或其受託處理者所在的境外地區儲存或處理。地區依實際服務配置而異；如需了解與您資料有關的處理地區，可透過本頁聯絡方式詢問。</p>
          <p>資料保存期間依下方說明及適用法令辦理；不因交由服務商處理而免除本社團依法應負的資料保護責任。</p>
        </section>

        <section id="cookies" aria-labelledby="cookies-title" className="scroll-mt-24 space-y-3">
          <h2 id="cookies-title">5. Cookies 與登入 Session</h2>
          <p>本網站使用必要的登入 Session Cookie「bgc_st」維持登入狀態，並非廣告追蹤 Cookie。它設為 HttpOnly；正式網站使用 Secure 與 SameSite 保護，目前登入有效期為 7 天。登出、撤銷 Session 或到期後，該 Session 不能再用於登入。</p>
          <p>封鎖或清除這個 Cookie 會影響登入功能，但仍可瀏覽公開內容。本網站目前未自行使用 localStorage 或 sessionStorage 保存個人資料，也未整合廣告追蹤或 Google Analytics。</p>
          <p>註冊安全驗證及第三方嵌入內容可能有其自身的 Cookie 或其他技術；不能將本網站的登入 Cookie 說明視為所有第三方都不處理瀏覽資料。</p>
        </section>

        <section id="email" aria-labelledby="email-title" className="scroll-mt-24 space-y-3">
          <h2 id="email-title">6. Email 驗證與寄信</h2>
          <p>目前系統透過 Brevo 寄送 Email 驗證信。傳送的資料包括收件 Email、用於稱呼的顯示名稱、主旨、包含驗證連結的信件內容，以及社團寄件名稱與地址；不會為寄送驗證信傳送您的電話或學號。</p>
          <p>驗證連結目前有效 60 分鐘；重新寄送或完成驗證後，舊連結可能失效。有效期不代表相關驗證紀錄會在到期時自動刪除。請勿把驗證連結或密碼提供給他人。</p>
        </section>

        <section id="providers" aria-labelledby="providers-title" className="scroll-mt-24 space-y-3">
          <h2 id="providers-title">7. 第三方服務</h2>
          <ul>
            <li>Supabase：提供資料庫服務，保存帳號與社團管理所需資料。</li>
            <li>Vercel：提供網站部署與執行環境，處理網站請求及必要的執行、安全與錯誤紀錄。</li>
            <li>Brevo：提供上述驗證信的寄送服務。</li>
            <li>Cloudflare Turnstile：用於註冊時辨識自動化濫用。您的瀏覽器會與 Cloudflare 連線，該服務可能處理 IP、瀏覽器及裝置訊號。</li>
            <li>YouTube、Bilibili 及其他圖片／直接影音來源：提供頁面中的外部內容，詳見下一節。</li>
          </ul>
          <p>各服務商在提供服務及其自身政策所述範圍內處理資料；我們無法代替第三方保證其全部處理方式。</p>
          <p><a href="https://www.cloudflare.com/turnstile-privacy-policy/">Cloudflare Turnstile 隱私說明</a></p>
        </section>

        <section id="embeds" aria-labelledby="embeds-title" className="scroll-mt-24 space-y-3">
          <h2 id="embeds-title">8. 外部圖片、連結與嵌入影音</h2>
          <p>公告、桌遊介紹或活動說明可能包含 YouTube、Bilibili 影片及直接影片／音訊網址。當播放器或媒體隨頁面載入時，瀏覽器可能直接向第三方發出請求，不一定要按下播放才會連線。外部頭像及桌遊圖片載入時也會連線至圖片提供者。</p>
          <p>YouTube 使用隱私強化的 youtube-nocookie 播放器，但不代表完全沒有第三方請求或資料處理。Bilibili 與其他來源也可能依其政策處理網路、裝置及使用資訊；我們無法控制這些平台的全部資料處理。</p>
          <p>開啟外部連結或使用第三方影音時，請同時留意提供者的條款與隱私政策。</p>
        </section>

        <section id="retention" aria-labelledby="retention-title" className="scroll-mt-24 space-y-3">
          <h2 id="retention-title">9. 資料保存</h2>
          <p>帳號、社員／幹部、借用及出席等資料，依提供服務、核對社團歷史紀錄及處理相關爭議的必要期間保存。當蒐集目的消失或期限屆滿時，依法刪除或停止處理、利用；如依法仍有保存必要，依該必要範圍處理。</p>
          <p>目前沒有依帳號閒置天數統一自動清除資料的機制。Session 或驗證連結到期代表不能繼續使用，不等於資料表、備份或歷史紀錄當下全部刪除。</p>
          <p>系統日誌的保存範圍依平台方案、配置及維運需要而定，未訂為全站一致的固定天數。您可依下節方式提出資料請求，我們會就具體情況依法處理。</p>
        </section>

        <section id="rights" aria-labelledby="rights-title" className="scroll-mt-24 space-y-3">
          <h2 id="rights-title">10. 您的個資權利</h2>
          <p>您可依個人資料保護法請求查詢或閱覽、製給複製本、補充或更正、停止蒐集／處理／利用，以及刪除個人資料。這些權利不得預先拋棄或以特約限制。</p>
          <p>部分資料可於網站設定更新；其他請求請寄至下方社團信箱，說明希望處理的資料及請求事項。我們會進行必要的身分核對，並依法定程序、期限與適用例外處理及回覆，不會僅以社團管理需要任意拒絕。</p>
          <p>您可於設定頁以目前密碼與確認文字申請註銷帳號；未完成 Email 驗證者可從等待驗證頁操作。有待處理或尚未歸還的桌遊時，須先完成借用流程。註銷無法復原，會撤銷登入、清除密碼憑證與個人資料，將帳號去識別為「已註銷使用者」；必要社團歷史仍依本政策保存。註銷不等於刪除全部歷史，也不限制另行提出法定個資請求。目前沒有完整匯出的按鈕。提出停止或刪除請求可能影響登入或依賴該資料的服務；是否仍須保存特定紀錄，會依法律與個案說明。請勿寄送密碼或驗證連結供身分核對。</p>
        </section>

        <section id="security" aria-labelledby="security-title" className="scroll-mt-24 space-y-3">
          <h2 id="security-title">11. 安全與錯誤紀錄</h2>
          <p>我們採取密碼雜湊、限制管理端存取及登入安全控制等合理措施。Email 驗證資料表只保存驗證碼雜湊。任何系統都無法保證絕對安全。</p>
          <p>網站以錯誤追蹤碼協助對應必要的功能類別、請求方式與錯誤代碼。應用程式的錯誤回報刻意排除密碼、Session／驗證碼、完整請求內容及身分驗證標頭；基礎設施仍可能另有必要的請求或安全紀錄。</p>
          <p>遇到問題時，可提供錯誤追蹤碼協助查詢，不需提供密碼或驗證連結。如發生依法應通知的個資事故，將依適用法令處理。</p>
        </section>

        <section id="updates" aria-labelledby="updates-title" className="scroll-mt-24 space-y-3">
          <h2 id="updates-title">12. 政策更新</h2>
          <p>我們會隨實際功能、資料處理方式或法規調整本政策，並於此頁標示最後更新日期。服務的使用規範另見使用條款。</p>
          <p><Link href="/terms">閱讀使用條款</Link></p>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 space-y-3">
          <h2 id="contact-title">13. 聯絡方式</h2>
          <p>如對資料處理有疑問或希望行使個資權利，請聯絡國立臺灣科技大學桌上遊戲研究社的官方信箱：</p>
          <p><a href="mailto:ntustboardgame@gmail.com">ntustboardgame@gmail.com</a></p>
        </section>
      </div>
    </article>
  );
}
