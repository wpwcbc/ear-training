---
target: Ear Train V2 Practice and Insights
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\wpwcb\\Documents\\OFF_REAL_DOC\\CODE\\WEBD1010\\EarTrain\\jazz-ear-lab-v2\\index.html"
target_fingerprint: "sha256:f4e12f03e5ab5e1ae30b61d960e20e8ade78b97217e7440279dd1ee7d150a256"
target_path: "C:\\Users\\wpwcb\\Documents\\OFF_REAL_DOC\\CODE\\WEBD1010\\EarTrain\\jazz-ear-lab-v2\\index.html"
timestamp: 2026-10-23T16-24-47Z
slug: jazz-ear-lab-v2-index-html
---
Method: dual-agent (A: 01a16987-59e2-7a63-9f29-0a441fe4d201 · B: 01a16987-5b8d-7c50-acbf-52d4c08829c0)

**評估結論**
範圍是目前主線 V2 的 Practice、Customize、結果與 Insights；桌機 1440×1000、手機 390×844，使用全新隔離情境。多條件 Insights 另用 540 筆明確標示的合成紀錄，不代表學習成效。
耳訓互動具有產品特色，外觀克制且一致；主要阻力是「理解練習條件，再回到下一次練習」，不是配色或品牌。沒有重現阻擋整個練習流程的 P0 問題。

**實際走查**
- M1：Start → Done → Incorrect → Unknown → 自動下一題；亦完成鍵盤操作。
- M2：答錯 → Replay／重試 → Reveal；重試正確後，結果仍保留首次答錯的證據。
- Customize：修改根音、切換 Exact、自動儲存、重新載入、Restore Default；另查空資料與多條件 Insights → 篩選 → Customize focus → 返回。

**優先問題**
1. **P1｜結構／無障礙：Insights 篩選後丟失操作焦點。** 鍵盤改 Root 後，焦點從選單跳回 Insights 標題；兩路量測一致。連續調整篩選必須重新尋找控制項，並非色彩或間距問題。
   改善：篩選更新保留原控制項焦點，頁面導覽才移至標題；提供簡短結果更新回饋。對應 `$impeccable harden`。[來源](C:/Users/wpwcb/Documents/OFF_REAL_DOC/CODE/WEBD1010/EarTrain/src/v2/app.ts:843)

2. **P2｜結構／資訊層級：先看到數字，卻難以確認比較的是哪組條件。** 實測 6 組條件的選單有約 135 字標籤，前半被根音清單佔據；手機 358px 控制項截掉後面的 target、context、exposure。完整設定又位於數字與混淆紀錄之後。
   改善：把既有條件中最能區分群組的資訊前置，於指標旁保留精簡條件摘要；完整清單與重複說明漸進揭露，不隱藏自評來源及樣本數。對應 `$impeccable distill`。[來源](C:/Users/wpwcb/Documents/OFF_REAL_DOC/CODE/WEBD1010/EarTrain/src/v2/app.ts:820)

3. **P2｜結構／手機效率：已有的主要動作不容易抵達。** Harmony 修改後 Start practice 約在 y=1101，低於 844px 視窗；Insights 的 Customize focus 約在 x=436，落在 390px 視窗右側。表格確實可鍵盤捲動，但看到動作時又失去左側音樂條件。
   改善：讓既有 Start 保持容易抵達；窄表格保留列身分並明示右側動作／捲動，不必刪除證據欄或增加新功能。對應 `$impeccable adapt`。[來源](C:/Users/wpwcb/Documents/OFF_REAL_DOC/CODE/WEBD1010/EarTrain/jazz-ear-lab-v2/v2.css:219)

4. **P2｜結構／標籤與回饋：即時訊息未完整解釋已發生的事。** 答錯後重試正確只顯示 Correct，但結果正確地保留首答失敗；Reveal 則有 First answer unchanged。切換 Exact 後設定確實保留，但重繪清空了儲存狀態文字。
   改善：區分「首答正確」與「重試正確」，並保留重新繪製後的儲存回饋；不改計分、不增加確認步驟。對應 `$impeccable clarify`。[來源](C:/Users/wpwcb/Documents/OFF_REAL_DOC/CODE/WEBD1010/EarTrain/src/v2/question.ts:92)

5. **P2｜結構／可預測性：按 Insights，卻先被送到 Session results。** 練習中點導覽會結束 session 並覆寫目的地，桌機、手機均需再按一次 Insights。資料有保存，但導覽的結果不符合按鈕名稱。
   改善：先確定結果頁是否刻意必經；若不是，保存後尊重使用者選的目的地。對應 `$impeccable shape`。[來源](C:/Users/wpwcb/Documents/OFF_REAL_DOC/CODE/WEBD1010/EarTrain/src/v2/app.ts:982)

**視覺與次要觀察**
- **P3｜純視覺：** Insights 指標、設定與限制說明多為相近大小／權重；強化既有數字與區段層級即可，不需要更換配色、字體或加裝飾。
- **P2｜聚焦範圍需明示：** 在 Root=G 的篩選結果按 Customize focus，實測仍帶入原設定的 12 個根音，而非只練 G。這是需要釐清的操作承諾，不直接判定為違反現有規格。
- **P3｜觸控與文案：** 主按鈕均達 44px；品牌連結約高 31px、歷史連結約 21px。Questions (0 = Unlimited) 暴露了內部數值慣例；都不應冒稱已證實 WCAG 違規。

**認知負荷與優點**
組塊、Insights 層級、跨區記憶有改善空間，屬中度負擔。12 根音、19 種和弦品質及 12 個 M2 答案不是同一種負擔；完整音樂答案集不應只為減少選項而刪減。
值得保留：一鍵 Start、M1 只在 Incorrect 後揭露錯音選單、Unknown、自動儲存／Restore，以及不被重試灌高的首答統計。
情境推演而非真人研究：熟練者會受重試文案影響；手機使用者多付出捲動成本；鍵盤使用者受篩選焦點跳轉影響。走查感受由開始時的順暢，轉為 Insights 閱讀與返回練習時的停頓。

**啟發式評分**
| 面向 | /4 | 主要依據 |
|---|---:|---|
| 系統狀態可見性 | 3 | 作答可見，儲存／重試回饋有缺口 |
| 符合音樂情境 | 4 | 和弦、音級與任務相符 |
| 使用者控制 | 2 | 可 Stop，但導覽目的地被覆寫 |
| 一致性 | 3 | 控制一致，部分回饋語意不一致 |
| 錯誤預防 | 3 | 驗證、Restore 與有效設定保存 |
| 辨識優於記憶 | 2 | Insights 條件需來回對照 |
| 彈性與效率 | 2 | 直接開始良好，篩選焦點與手機路徑拖慢 |
| 簡潔與視覺層級 | 3 | Practice 克制，Insights 權重過平 |
| 錯誤復原 | 3 | Replay／Retry／Reveal 流程可完成 |
| 說明支援 | 2 | 有限制說明，條件與重試解讀仍費力 |
| **合計** | **27/40** | **可用，應先改善流程；不是使用者研究或無障礙認證** |

**掃描判讀**
CLI 只有 1 項 overused-font 警告，對應共用 Inter 字體設定；在沿用既有工具介面的情境下，不構成需換字體的 UX 缺陷。執行期跨 10 個畫面／尺寸有 11 次觀測：6 次字體、5 次長行，並非 11 個獨立問題；長行訊號與冗長設定／說明的觀察相符。
10 個畫面的 axe 均為 0 項已確認違規，亦無整頁水平溢出；仍有群組命名及被裁切表頭的對比需人工檢視。可捲動表格和真實鍵盤焦點問題，不能只靠靜態掃描判斷。
