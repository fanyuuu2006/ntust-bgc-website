import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="container min-w-0 max-w-3xl space-y-8 py-8 wrap-anywhere text-sm leading-7 text-(--text-secondary) sm:py-10 sm:text-base [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-(--text-primary) [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-(--interactive-primary) [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-(--border-default) [&_a:hover]:decoration-current [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-(--text-primary) sm:text-3xl">使用條款</h1>
        <p className="text-sm text-(--text-muted)">最後更新：<time dateTime="2026-09-14">2026/09/14</time></p>
        <p>使用網站帳號、社員服務與桌遊借用功能前，請先了解以下規範。</p>
      </header>
      <nav aria-label="本頁內容" className="border-y border-(--border-default) py-4">
        <p className="mb-2 text-sm font-medium text-(--text-primary)">本頁內容</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <a className="inline-flex min-h-9 items-center" href="#account">帳號與 Email 驗證</a>
          <a className="inline-flex min-h-9 items-center" href="#membership">帳號與社員資格</a>
          <a className="inline-flex min-h-9 items-center" href="#borrowing">桌遊借用與歸還</a>
          <a className="inline-flex min-h-9 items-center" href="#content">網站內容與第三方素材</a>
          <a className="inline-flex min-h-9 items-center" href="#contact">聯絡方式</a>
        </div>
      </nav>
      <div className="space-y-8">
        <section id="scope" aria-labelledby="scope-title" className="scroll-mt-24 space-y-3">
          <h2 id="scope-title">1. 網站與服務</h2>
          <p>本網站由國立臺灣科技大學桌上遊戲研究社維運，提供公告、桌遊資訊、網站帳號及社團管理服務。請依本條款及各功能說明使用網站。個人資料如何處理，另見隱私權政策。</p>
          <p><Link href="/privacy">閱讀隱私權政策</Link></p>
        </section>

        <section id="account" aria-labelledby="account-title" className="scroll-mt-24 space-y-3">
          <h2 id="account-title">2. 帳號與 Email 驗證</h2>
          <p>註冊時請提供合理、正確的顯示名稱、Email 與所需個人資料，不得冒用他人身分。請妥善保管密碼與登入狀態，避免共用帳號；發現未經授權使用或安全疑慮時，請聯絡社團。</p>
          <p>請使用可接收信件的 Email 並完成驗證。未驗證帳號會受到系統功能限制；需要登入、社員資格或幹部授權的功能，仍須符合各自條件。驗證信不會要求您回傳密碼。</p>
          <p>您可在設定或等待驗證頁註銷帳號。此操作不可復原，須重新驗證密碼且沒有未完成借用；必要歷史會保留，註銷不免除既有借用約定或法定責任。</p>
        </section>

        <section id="membership" aria-labelledby="membership-title" className="scroll-mt-24 space-y-3">
          <h2 id="membership-title">3. 帳號與社員資格</h2>
          <p>網站帳號不等於社員資格。當學年度社員身分依該學年度的有效資格紀錄及社團入社程序確認，不會因註冊或 Email 驗證就自動取得。</p>
          <p>「一般社員」與「終生社員」是社團紀錄中的類型；網站仍依特定學年度及資格狀態判斷，不代表終生社員自動具有每一學年度的有效資格，也不是額外的網站管理權限。</p>
          <p>幹部身分與權限依相關學年度的職務紀錄確認；如資料有誤，請聯絡幹部核對。</p>
        </section>

        <section id="borrowing" aria-labelledby="borrowing-title" className="scroll-mt-24 space-y-3">
          <h2 id="borrowing-title">4. 桌遊借用與歸還</h2>
          <ul>
            <li>已登入、完成 Email 驗證且符合當前系統條件的使用者可提出借用申請；仍須視桌遊狀態及既有借用流程而定。</li>
            <li>申請不代表核准。幹部核准後，仍須安排實體領取；完成領取並由幹部確認後，才記錄為正式借出。</li>
            <li>借出時會確認預計歸還期限。請妥善保管桌遊及配件，依約歸還；若無法準時歸還，請主動聯絡幹部。</li>
            <li>如有遺失、損壞或配件短缺，依社團規範與個案核對處理，本條款不另訂固定賠償金額。</li>
          </ul>
          <p>借用資格、費用及其他現場規則，依當時公告或社團現場規範為準，請在領取前確認。非當學年度社員可能於領取時產生借用費用。</p>
        </section>

        <section id="events" aria-labelledby="events-title" className="scroll-mt-24 space-y-3">
          <h2 id="events-title">5. 活動參與與簽到</h2>
          <p>活動內容與參加條件依各活動說明及社團安排為準，擁有網站帳號不保證取得活動名額或所有參與資格。</p>
          <p>自行簽到須符合系統顯示的開放時段及當學年度社員條件。請如實記錄出席，不代他人簽到；如有誤記或需要補正，可聯絡幹部核對。</p>
        </section>

        <section id="content" aria-labelledby="content-title" className="scroll-mt-24 space-y-3">
          <h2 id="content-title">6. 網站內容與第三方素材</h2>
          <p>公告、桌遊介紹及活動說明由獲授權的管理人員維護，可能包含外部連結、YouTube／Bilibili 影片或其他直接影音。</p>
          <p>第三方網站與影音由其提供者負責；連結或嵌入不代表本社團為其全部內容或服務背書。使用時亦須留意第三方條款與隱私政策。</p>
          <p>本網站自行製作的內容，其權利依法律及實際權利歸屬處理；第三方商標、桌遊名稱、圖片及影音等權利仍歸原權利人。請依適用法律與權利人的授權使用，不因出現在本網站就取得任意重製或利用的權利。</p>
        </section>

        <section id="conduct" aria-labelledby="conduct-title" className="scroll-mt-24 space-y-3">
          <h2 id="conduct-title">7. 合理使用與禁止行為</h2>
          <ul>
            <li>不得冒用他人帳號或身分。</li>
            <li>不得未經授權存取他人資料、管理功能，或嘗試繞過安全與身分驗證機制。</li>
            <li>不得以惡意請求、攻擊或其他方式干擾、破壞網站正常運作。</li>
            <li>不得利用網站從事違法行為。</li>
          </ul>
        </section>

        <section id="availability" aria-labelledby="availability-title" className="scroll-mt-24 space-y-3">
          <h2 id="availability-title">8. 服務維護與可用性</h2>
          <p>網站可能因維護、故障、網路或第三方服務異常暫停，無法保證永不中斷。無法使用線上功能時，可聯絡幹部確認借用、歸還或活動等事項，請勿把系統中斷視為已免除原有約定。</p>
          <p>我們會依實際狀況處理問題；本條款不排除或限制依法不得免除的責任，也不要求您放棄法定權利。</p>
        </section>

        <section id="updates" aria-labelledby="updates-title" className="scroll-mt-24 space-y-3">
          <h2 id="updates-title">9. 條款更新</h2>
          <p>我們可能隨功能或社團作業調整使用條款，更新內容與日期會刊登於本頁。使用相關服務前，請留意當時的功能說明及規範。</p>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24 space-y-3">
          <h2 id="contact-title">10. 聯絡方式</h2>
          <p>對本條款、帳號、社員紀錄或借用流程有疑問，請聯絡國立臺灣科技大學桌上遊戲研究社的官方信箱：</p>
          <p><a href="mailto:ntustboardgame@gmail.com">ntustboardgame@gmail.com</a></p>
        </section>
      </div>
    </article>
  );
}
