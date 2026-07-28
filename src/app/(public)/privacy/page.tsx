import { siteConfigs } from "@/libs/siteConfigs";

export default function PrivacyPage() {
  return (
    <section>
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-10">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
              隱私權政策
            </h1>
            <p className="text-sm text-(--muted)">
              適用於{siteConfigs.title}（以下稱「本網站」）。
            </p>
          </header>

          <article className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                前言與適用範圍
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站由{siteConfigs.fullName}
                維運，主要提供社團介紹、活動資訊與社員相關服務。我們重視使用者的個人資料，這份政策說明我們會蒐集哪些資料、如何使用，以及使用者擁有的權利。
              </p>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本政策僅適用於本網站，若頁面中包含連結至其他網站，該網站的隱私權保護方式請以該網站自身的政策為準，不在本政策的涵蓋範圍內。
              </p>
              <p className="text-sm leading-relaxed text-(--foreground)">
                使用本網站即表示您已閱讀並理解本政策的內容。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                我們蒐集哪些資料
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                註冊網站帳號時，我們會蒐集以下資料：
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>姓名</li>
                <li>Email</li>
                <li>密碼（僅保存不可逆的雜湊值，我們無法得知您的原始密碼）</li>
              </ul>
              <p className="text-sm leading-relaxed text-(--foreground)">
                登入後，系統會建立 Session 以維持您的登入狀態。
              </p>
              <p className="text-sm leading-relaxed text-(--muted)">
                未來若開放社員資料建檔或活動報名功能，我們會另外說明屆時蒐集的資料範圍，並更新本政策。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                資料使用目的
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們蒐集的資料僅用於以下目的：
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>建立與管理您的網站帳號</li>
                <li>驗證您的登入身分</li>
                <li>維護網站安全與正常運作</li>
              </ul>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們不會將您的資料用於前述目的以外的用途，除非事先取得您的同意，或法律另有規定。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                Cookie 與 Session
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站使用一組 httpOnly cookie
                記錄您的登入狀態（Session），這是維持登入功能所必要的機制，僅用於辨識您的登入身分，不會用於追蹤或廣告用途。
              </p>
              <p className="text-sm leading-relaxed text-(--foreground)">
                登出或 Session 過期後，該 cookie 即會失效。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                資料保護與保存
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                您的帳號資料會保存至您主動申請刪除帳號，或經社團判斷長期未使用而清除為止。密碼一律以雜湊方式儲存，我們的管理人員無法檢視您的原始密碼。
              </p>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們僅由經授權的幹部或管理人員接觸您的個人資料，並會盡合理的技術與管理方式，避免資料遭未經授權存取、洩漏或竄改。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                對外連結
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站部分頁面可能包含連結至社群平台或其他外部網站，這些連結網站不適用本政策，其隱私權保護方式請參考該網站自身公告的政策。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                第三方服務
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站的資料庫與後端服務由 Supabase
                提供，我們僅使用其資料儲存功能，不會將您的個人資料提供、交換、出租或出售給其他第三方作行銷或商業用途，法律另有規定者不在此限。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                使用者權利
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                您可以隨時：
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>查詢我們保存的您的個人資料</li>
                <li>要求更正錯誤的資料</li>
                <li>要求刪除您的帳號與相關資料</li>
              </ul>
              <p className="text-sm leading-relaxed text-(--foreground)">
                如有相關需求，請透過下方聯絡方式與我們聯繫。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                聯絡方式
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                若您對本隱私權政策有任何疑問，或希望行使前述權利，歡迎透過
                {siteConfigs.fullName}的官方社群管道，或直接聯繫現任幹部。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                政策更新
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們可能因應網站功能調整而更新本政策，更新後的內容將直接刊登於本頁面。建議您於使用本網站服務時，不定期回來查看是否有異動。
              </p>
            </section>
          </article>
        </div>
      </div>
    </section>
  );
}
