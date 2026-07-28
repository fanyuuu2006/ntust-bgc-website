import { siteConfigs } from "@/libs/siteConfigs";
import Link from "next/link";

export default function TermsPage() {
  return (
    <section>
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-10">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
              服務條款
            </h1>
            <p className="text-sm text-(--muted)">
              適用於{siteConfigs.title}（以下稱「本網站」）。
            </p>
          </header>

          <article className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                網站用途
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站提供{siteConfigs.fullName}
                的社團介紹、活動資訊，以及社員相關服務。使用本網站即表示您同意遵守本服務條款。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                使用者資格
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                若您為未滿 18
                歲的未成年人，建議在師長或監護人的指導下使用本網站服務。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                帳號管理
              </h2>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>註冊帳號時，請提供真實且正確的姓名與 Email。</li>
                <li>您應妥善保管自己的帳號密碼，不與他人共用。</li>
                <li>若發現帳號有異常登入或安全疑慮，請儘速通知我們。</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                使用者義務
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                使用本網站時，您同意：
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>提供真實資料，不冒用他人身分</li>
                <li>合理使用網站功能，不進行過度或惡意的存取</li>
                <li>對自己帳號下的所有行為負責</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                禁止事項
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                使用本網站時，請勿：
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-(--foreground)">
                <li>冒用他人身分註冊或登入</li>
                <li>嘗試入侵、破壞或干擾網站的正常運作</li>
                <li>未經授權存取他人帳號或非公開資料</li>
                <li>散布不實資訊或從事任何違法行為</li>
              </ul>
              <p className="text-sm leading-relaxed text-(--foreground)">
                若違反上述事項，管理員有權暫停或終止您的帳號使用權限。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                隱私保護
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們重視您的隱私，關於個人資料的蒐集與使用方式，請參閱本網站的{" "}
                <Link
                  href="/privacy"
                  className="text-(--primary) hover:underline"
                >
                  隱私權政策
                </Link>
                。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                智慧財產權
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站的文字、圖片、標誌等內容，除另有標示外，其著作權歸
                {siteConfigs.fullName}
                所有。未經同意，請勿擅自重製或轉載作商業用途。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                社員資格說明
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                請特別注意：
                <strong className="font-semibold">
                  註冊本網站帳號，不代表您已成為{siteConfigs.fullName}的正式社員
                </strong>
                。
              </p>
              <p className="text-sm leading-relaxed text-(--foreground)">
                網站帳號僅用於登入本網站、使用網站提供的功能。若您希望加入社團、取得社員資格，仍須依照社團當時公告的入社流程另行申請，社員身分將由社團依內部規定認定，不會僅因擁有網站帳號而自動取得。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                責任限制
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本網站由學生社團自行維運，我們會盡力維持服務的穩定與正常運作，但對於不可抗力因素（如天災、網路中斷、伺服器服務商問題等）或非本網站過失所造成的服務中斷或資料遺失，恕不負責。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                網站內容修改
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                我們可能因應社團營運需求，調整、新增或移除網站功能與內容，也可能修改本服務條款。修改後的條款將直接刊登於本頁面，建議您不定期回來查看是否有異動。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                其他
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                本條款如有未盡事宜，將依中華民國相關法令解釋與處理。若本條款任一條款經認定為無效或不可執行，不影響其餘條款的效力。
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-(--foreground)">
                聯絡方式
              </h2>
              <p className="text-sm leading-relaxed text-(--foreground)">
                若您對本服務條款有任何疑問，歡迎透過{siteConfigs.fullName}
                的官方社群管道，或直接聯繫現任幹部。
              </p>
            </section>
          </article>
        </div>
      </div>
    </section>
  );
}
