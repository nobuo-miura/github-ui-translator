// ポップアップの言語選択（「自動」と手動選択の区別）のテスト
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPopup } from './helpers.mjs';

let popup;
afterEach(() => popup?.close());

function languageSelect() {
  return popup.document.querySelector('#language');
}

describe('ポップアップの言語選択', () => {
  it('繁体字を自動判定し、台湾向けの辞書を手動選択できる', async () => {
    popup = await loadPopup({ uiLanguage: 'zh-Hant' });
    assert.equal(languageSelect().options[0].textContent, 'autoLanguageOption(繁體中文)');
    assert.equal([...languageSelect().options].find((option) => option.value === 'zh-TW').textContent, '繁體中文');
    popup.select('#language', 'zh-TW');
    assert.deepEqual(popup.storageCalls, [{ method: 'set', items: { language: 'zh-TW' } }]);
  });

  it('先頭に「自動」があり、判定された言語名を表示する', async () => {
    popup = await loadPopup({ uiLanguage: 'de' });
    const [first, second] = languageSelect().options;
    assert.equal(first.value, '');
    assert.equal(first.textContent, 'autoLanguageOption(Deutsch)');
    assert.equal(second.value, 'ja');
  });

  it('対応していない表示言語では、「自動」に「翻訳しない」を表示し、言語を選ぶよう案内する', async () => {
    popup = await loadPopup({ uiLanguage: 'en-US' });
    assert.equal(languageSelect().options[0].textContent, 'autoLanguageOption(noTranslationOption)');
    assert.equal(popup.document.querySelector('#status').textContent, 'unsupportedBrowserLanguageStatus');
  });

  it('対応していない表示言語でも、言語を選ぶと通常のON表示に戻る', async () => {
    popup = await loadPopup({ uiLanguage: 'en-US' });
    popup.select('#language', 'ja');
    assert.equal(popup.document.querySelector('#status').textContent, 'translationEnabledStatus');
  });

  it('対応している表示言語では、通常のON表示にする', async () => {
    popup = await loadPopup({ uiLanguage: 'de' });
    assert.equal(popup.document.querySelector('#status').textContent, 'translationEnabledStatus');
  });

  it('言語が未設定なら「自動」を選択状態にする', async () => {
    popup = await loadPopup({ uiLanguage: 'de' });
    assert.equal(languageSelect().value, '');
  });

  it('保存済みの言語があれば、その言語を選択状態にする', async () => {
    popup = await loadPopup({ uiLanguage: 'de', settings: { language: 'fr' } });
    assert.equal(languageSelect().value, 'fr');
  });

  it('「自動」の状態から判定結果と同じ言語を選ぶと、その言語を保存する', async () => {
    popup = await loadPopup({ uiLanguage: 'de' });
    popup.select('#language', 'de');
    assert.deepEqual(popup.storageCalls, [{ method: 'set', items: { language: 'de' } }]);
  });

  it('「自動」を選ぶと、保存済みの言語を削除する', async () => {
    popup = await loadPopup({ uiLanguage: 'de', settings: { language: 'fr' } });
    popup.select('#language', '');
    assert.deepEqual(popup.storageCalls, [{ method: 'remove', keys: 'language' }]);
  });
});

describe('ポップアップの原文ツールチップ設定', () => {
  it('既定ではOFFを表示する', async () => {
    popup = await loadPopup();
    assert.equal(popup.document.querySelector('#show-original-toggle').checked, false);
  });

  it('保存済みの設定がONなら、ONを表示する', async () => {
    popup = await loadPopup({ settings: { showOriginalOnHover: true } });
    assert.equal(popup.document.querySelector('#show-original-toggle').checked, true);
  });

  it('切り替えると設定を保存する', async () => {
    popup = await loadPopup();
    const toggle = popup.document.querySelector('#show-original-toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new popup.window.Event('change', { bubbles: true }));
    assert.deepEqual(popup.storageCalls, [{ method: 'set', items: { showOriginalOnHover: true } }]);
  });
});
