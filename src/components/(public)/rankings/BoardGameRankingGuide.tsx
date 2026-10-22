export function calculateRankingExample() {
  const borrowingHeat = Math.log(17) / Math.log(21);
  const participation = Math.log(5) / Math.log(11);
  const bayesian = (4 * 4.5 + 5 * 3.5) / 9;
  const quality = (bayesian - 1) / 4;
  const score = 0.5 * borrowingHeat + 0.35 * quality + 0.15 * participation;
  return {
    borrowingHeat,
    participation,
    bayesian,
    quality,
    score,
    displayScore: Number((score * 100).toFixed(1)),
  };
}

function WeightStack() {
  return (
    <div className="mt-3 space-y-2">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-(--surface-subtle)"
        aria-label="綜合指數權重：借用熱度 50%、評價品質 35%、評價參與度 15%"
      >
        <div className="bg-(--status-warning)" style={{ width: "50%" }} />
        <div className="bg-(--interactive-primary)" style={{ width: "35%" }} />
        <div className="bg-(--status-success)" style={{ width: "15%" }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <span>借用熱度 50%</span>
        <span>評價品質 35%</span>
        <span>評價參與度 15%</span>
      </div>
    </div>
  );
}

export function BoardGameRankingGuide() {
  const example = calculateRankingExample();
  return (
    <div className="space-y-6 text-sm leading-6 text-(--text-muted)">
      <section>
        <h3 className="font-semibold text-(--text-primary)">
          四種排行怎麼比較？
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <strong className="text-(--text-primary)">綜合排行</strong>
            <p>一起看借用、評價品質與評價參與情況。</p>
          </div>
          <div>
            <strong className="text-(--text-primary)">評分排行</strong>
            <p>看整體評分表現，也考慮評分人數。</p>
          </div>
          <div>
            <strong className="text-(--text-primary)">評論排行</strong>
            <p>看公開文字評論最多的桌遊。</p>
          </div>
          <div>
            <strong className="text-(--text-primary)">借用排行</strong>
            <p>看已完成借用次數最多的桌遊。</p>
          </div>
        </div>
      </section>
      <section className="border-t border-(--border-muted) pt-5">
        <h3 className="font-semibold text-(--text-primary)">
          綜合指數怎麼計算？
        </h3>
        <WeightStack />
        <p className="mt-4 rounded-lg bg-(--surface-subtle) px-3 py-2 text-center font-mono text-(--text-primary)">
          S = 0.50B + 0.35Q + 0.15P
          <br />
          畫面綜合指數 = S × 100
        </p>
        <p className="mt-3">
          三個指標都會先換成 0～1
          的比例，才能放在同一個公式比較。綜合指數代表整體表現，不是平均星級。
        </p>
      </section>
      <details className="border-t border-(--border-muted) pt-5">
        <summary className="cursor-pointer font-semibold text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
          進階規則與計算範例
        </summary>
        <div className="mt-3 space-y-4">
          <section>
            <h4 className="font-medium text-(--text-primary)">
              步驟一：原始資料
            </h4>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <dt>已完成借用</dt>
              <dd className="text-right tabular-nums">16 次</dd>
              <dt>評分人數</dt>
              <dd className="text-right tabular-nums">4 人</dd>
              <dt>平均評分</dt>
              <dd className="text-right tabular-nums">4.5 / 5</dd>
              <dt>全站平均評分（假設）</dt>
              <dd className="text-right tabular-nums">3.5</dd>
            </dl>
          </section>
          <section>
            <h4 className="font-medium text-(--text-primary)">
              步驟二：三項指標
            </h4>
            <div className="mt-2 space-y-3">
              <details>
                <summary>
                  B 借用熱度 ≈ {example.borrowingHeat.toFixed(3)}
                </summary>
                <p className="mt-1 wrap-break-word">
                  ln(1 + 16) / ln(21) = {example.borrowingHeat.toFixed(3)}
                  ；數字越高代表完成借用越多。
                </p>
              </details>
              <details>
                <summary>Q 評價品質 ≈ {example.quality.toFixed(3)}</summary>
                <p className="mt-1 wrap-break-word">
                  Bayesian = (4×4.5 + 5×3.5) / 9 = {example.bayesian.toFixed(3)}
                  ；Q = ({example.bayesian.toFixed(3)} − 1) / 4 ={" "}
                  {example.quality.toFixed(3)}。
                </p>
              </details>
              <details>
                <summary>
                  P 評價參與度 ≈ {example.participation.toFixed(3)}
                </summary>
                <p className="mt-1 wrap-break-word">
                  ln(1 + 4) / ln(11) = {example.participation.toFixed(3)}
                  ；評分人數越多，參與度越高。
                </p>
              </details>
            </div>
          </section>
          <section>
            <h4 className="font-medium text-(--text-primary)">
              步驟三：權重加總
            </h4>
            <dl className="mt-2 space-y-1 font-mono text-xs">
              <div className="flex justify-between gap-3">
                <dt>B × 50%</dt>
                <dd>{(example.borrowingHeat * 0.5).toFixed(3)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Q × 35%</dt>
                <dd>{(example.quality * 0.35).toFixed(3)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>P × 15%</dt>
                <dd>{(example.participation * 0.15).toFixed(3)}</dd>
              </div>
            </dl>
            <p className="mt-3 font-semibold text-(--text-primary)">
              S = {example.score.toFixed(3)}，綜合指數 ≈ {example.displayScore}
            </p>
          </section>
          <p>
            <strong className="text-(--text-primary)">
              為什麼評分最高不一定第一？
            </strong>{" "}
            一人給五星不一定比很多人給出高分的桌遊更穩定。Bayesian
            公式會把平均分與全站平均按評分人數加權；例如 1 人 5 分會調整為
            3.75，20 人平均 4.4 分會調整為 4.22。
          </p>
          <p>
            <strong className="text-(--text-primary)">入榜與同分：</strong>
            各排行只納入符合該項資料條件的桌遊；相同分數則依該排行的既定次要排序穩定排列。
          </p>
        </div>
      </details>
    </div>
  );
}
