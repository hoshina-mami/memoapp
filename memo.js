//****************************************************
//* js研修　メモアプリ
//****************************************************
//残タスクを'TODO'で検索して確認すること

//TODO Androidスクロール対応！touchイベントを導入しよう。。。
//参考：http://lab.informarc.co.jp/javascript/overflow_for_android.html
//		http://d.hatena.ne.jp/koba04/20110902/1314889377

//TODO iPhone4で実機確認

//TODO リファクタリング　関数の順番とか整理

//TODO リスト0件表示

//TODO 半角スペースのみで投稿とか試してエラー処理を徹底

//TODO kyeUpは変える？

(function() {
	var APP_NAME = 'hoshina',
		ENDPOINT = 'http://cshooljs.dynalogue.com/api/data/',

		memoHome = document.getElementById('memo_home'),			//メモホーム画面
		memoTitle = document.getElementById('edit_title'),			//メモのタイトル
		memoBody = document.getElementById('edit_body'),			//メモの内容
		memoList = document.getElementById('memo_list'),			//メモのリスト(ul)
		memoEdit = document.getElementById('memo_edit'),			//メモ編集画面
		memoConfirm = document.getElementById('memo_confirm'),		//メモ削除確認画面
		mask = document.getElementById('mask');						//マスク



	/* 初期化 */
	document.addEventListener('DOMContentLoaded', function() {

		//ブラウザのバーを隠す
		setTimeout('scrollTo(0,1)', 100);
		
		//画面固定
		memoHome.getElementsByTagName('header')[0].addEventListener('touchmove', function(event) {
			event.preventDefault();
		}, false);

		//メモ一覧を読み込む
		getMemoList();

		//イベント登録
		//新規登録ボタン
		document.getElementById('btn_new').addEventListener('click', showEdit, false);
		
		//リロードボタン
		document.getElementById('btn_reload').addEventListener('click', function() { location.reload(); }, false);
		
		//保存ボタン
		document.getElementById('btn_post').addEventListener('click', function(event) {
			var memoId = Number(event.target.parentNode.getAttribute('data-memoId'));
			if (memoId !== 0) {
				putEditMemo();
			} else {
				postMemo();
			}
		}, false);
		
		//キャンセルボタン
		document.getElementById('btn_editCancel').addEventListener('click', closeEdit, false);
		document.getElementById('btn_deletCancel').addEventListener('click', closeConfirm, false);
		
		//入力エリア
		memoTitle.addEventListener('keyup', saveTemporary, false);
		memoTitle.addEventListener('blur', saveTemporary, false);
		memoBody.addEventListener('keyup', saveTemporary, false);
		memoBody.addEventListener('blur', saveTemporary, false);

	}, false);
	
	
	/* タッチイベント設定 */
	var touchHandler = function(event) {
		event.preventDefault();
		var touch = event.touches[0];
		console.log(touch);
	};



	/* メモ一覧の成形 */
	var createMemoList = function(json) {
		//メモ一覧を初期化
		memoList.innerHTML = '';

		for (var i = 0, len = json.length; i < len; i++) {
			//リストの内容を成形
			var li = document.createElement('li');
			li.setAttribute('data-memoId', json[i].id);
			
			//お気に入り登録をチェックしクラスを振り分け
			if (window.localStorage.getItem(json[i].id) !== null) {
				var likeBtnClass = 'btn_like_active';
			} else {
				var likeBtnClass = 'btn_like';
			}
			
	 		var txt = '<span class="created_date">' + json[i].modified + '</span>'
					+ '<p class="title">' + json[i].title + '</p>'
					+ '<div class="' + likeBtnClass + '"></div>' 
					+ '<div class="content" style="display:none;">'
					+ '<p class="text">' + json[i].body + '</p>'
					+ '<div class="content_buttons"><button class="btn_delete">削 除</button>'
					+ '<button class="btn_edit">編 集</button></div>'
					+ '</div>';

			var range = document.createRange();
			range.selectNodeContents(document.body);
			li.appendChild(range.createContextualFragment(txt));
			
			//変更が一時保存されている記事があれば「！」を表示
			if (json[i].id === window.localStorage.getItem('memoId')) {
				li.id = 'temporarySaved';
			}

			//リストにイベント登録
			li.addEventListener('click', function(event) {
				//扱う記事の情報を取得
				var id = event.currentTarget.getAttribute('data-memoId');
				var target = event.currentTarget.getElementsByClassName('content')[0];

				if (event.target.className === 'btn_edit') {
					//編集ボタン
					getEditMemo(id);
				} else if (event.target.className === 'btn_delete') {
					//削除ボタン（削除確認画面を表示）
					confirmDelete(id);
				} else if (event.target.className === 'btn_like') {
					//お気に入りボタンをアクティブにする
					event.target.className = 'btn_like_active';
					window.localStorage.setItem(id, 'like_active');
				} else if (event.target.className === 'btn_like_active') {
					//お気に入りボタンを非アクティブにする
					event.target.className = 'btn_like';
					window.localStorage.removeItem(id);
				} else {
					//メモ詳細を開く・閉じる
					showContentDetail(target);
				}

			}, false);

			//リストをブラウザに表示
			memoList.appendChild(li);
		}

	};
	
	
	/* 削除確認・削除呼び出し */
	var confirmDelete = function(id) {
		document.getElementById('confirm_buttons').setAttribute('data-memoId', id);
		
		//削除確認画面を表示
		mask.style.display = 'block';
		memoConfirm.style.display = 'block';
		
		//削除ボタンを押したら、削除APIをたたく
		document.getElementById('btn_doDelet').addEventListener('click', function(event) {
			var id = event.target.parentNode.getAttribute('data-memoId');
			deleteMemo(id);
			event.target.removeEventListener('click', arguments.callee, false);
		}, false);
	};
	
	/* 編集画面を閉じる */
	var closeConfirm = function() {
		mask.style.display = 'none';
		memoConfirm.style.display = 'none';
	};


	/* メモの詳細表示 */
	var showContentDetail = function(target) {
		//表示・非表示を切り替え
		if (target.style.display === 'none') {
			target.style.display = 'block';
		} else {
			target.style.display = 'none';
		}
	};



	/* 編集画面を表示 */
	var showEdit = function(event, json) {
		if (json !== undefined) {
			document.getElementById('edit_buttons').setAttribute('data-memoId', json.id);
			//編集ボタンから開いた場合、記事の内容を表示する
			loadMemoContents(json);
		} else {
			//フォームの初期化
			document.getElementById('edit_buttons').setAttribute('data-memoId', 0);
			loadMemoContents();
		}

		//編集画面を表示
		mask.style.display = 'block';
		memoEdit.style.display = 'block';
	};



	/* 編集画面を閉じる */
	var closeEdit = function() {
		mask.style.display = 'none';
		memoEdit.style.display = 'none';

		//一時保存情報をストレージから削除
		window.localStorage.removeItem('memoId');
		window.localStorage.removeItem('memoTitle');
		window.localStorage.removeItem('memoBody');
	};



	/* アラート表示 */
	var showAlert = function(str, alertType) {
		var alertDiv = document.createElement('div');
		alertDiv.id = 'memo_alert';
		alertDiv.className = alertType;

		var range = document.createRange();
		range.selectNodeContents(document.body);
		alertDiv.appendChild(range.createContextualFragment(str));

		//表示
		memoHome.appendChild(alertDiv);

		//表示を2秒後にふわっと消す
		setTimeout(function() {
			var alertOpacity = 0.8;
			var intervalId = setInterval(function() {
				if (alertOpacity <= 0){
					clearInterval(intervalId);
					memoHome.removeChild(alertDiv);
				} else {
					alertOpacity = alertOpacity - 0.1;
					alertDiv.style.opacity = alertOpacity;
				}
			}, 20);
		}, 2000);
	};



	/* フォームの入力値をストレージに保存する */
	var saveTemporary = function() {
		//ストレージに保存
		window.localStorage.setItem('memoId', document.getElementById('edit_buttons').getAttribute('data-memoId'));
		window.localStorage.setItem('memoTitle', memoTitle.value);
		window.localStorage.setItem('memoBody', memoBody.value);
	};



	/* ストレージから内容を読み出す */
	var loadTemporary = function() {
		//ストレージからメモ内容を読み出し
		memoTitle.value = window.localStorage.getItem('memoTitle');
		memoBody.value = window.localStorage.getItem('memoBody');
		var txt = '前回編集中断した<br>内容を表示します。';
		showAlert(txt, 'message');
	};



	/* 編集画面のフォームの初期値設定 */
	var loadMemoContents = function(json) {
		//新規登録ボタンから開いた時（jsonが定義されていない）
		if (json === undefined) {
			if (window.localStorage.getItem('memoId') === '0'){
				//保存していない書きかけの記事のデータがあれば読み出す
				loadTemporary();
			} else {
				//書きかけ記事がなければ、デフォルトの初期値を入れる
				memoTitle.value = 'no-title';
				memoBody.value = 'memo';
				formDefault();
			}
		}
		//編集ボタンから開いた時
		//ストレージに値がある場合、開いた記事IDとストレージ内の記事IDが一致すれば読み出す
		else if (json.id === window.localStorage.getItem('memoId')) {
			loadTemporary();
		} else {
			memoTitle.value = json.title;
			memoBody.value = json.body;
		}
	};
	
	
	/* フォームにデフォルト初期値が入っている場合の処理 */
	var formDefault = function() {
		memoTitle.style.color = '#ccc';
		memoBody.style.color = '#ccc';
		
		//フォーカスがあたると初期値を消去
		memoTitle.addEventListener('focus', function() {
			memoTitle.style.color = '#353535';
			memoTitle.value = '';
			memoTitle.removeEventListener('focus', arguments.callee, false);
		}, false);
		
		memoBody.addEventListener('focus', function() {
			memoBody.style.color = '#353535';
			memoBody.value = '';
			memoBody.removeEventListener('focus', arguments.callee, false);
		}, false);
	};




	/**
	 * 新規登録
	 * URL:http://cshooljs.dynalogue.com/api/data/
	 * リクエストメソッド:POST
	 */
	var postMemo = function() {
		if (memoTitle.value === 'no-title' && memoBody.value === 'memo') {
			//投稿完了表示
			var successTxt = '内容が未編集です。';
			showAlert(successTxt, 'caution');
			return;
		}
		
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				if(xhr.status === 200) {

					//編集画面を閉じる
					closeEdit();

					//メモ一覧を再読み込み
					getMemoList();

					//投稿完了表示
					var successTxt = 'メモを追加しました。';
					showAlert(successTxt, 'message');

					//一時保存情報をストレージから削除
					window.localStorage.removeItem('memoId');
					window.localStorage.removeItem('memoTitle');
					window.localStorage.removeItem('memoBody');

				} else {
					//異常系処理
					if (memoBody.value === '') {
						//本文が空の場合
						var alertTxt = '本文を<br>入力してください。';
						showAlert(alertTxt, 'caution');
					} else {
						var alertTxt = 'エラーが<br>発生しました。';
						showAlert(alertTxt, 'caution');
					}
				}
			}
		};

		xhr.open('POST', ENDPOINT);

		//パラメータ生成
		var param = 'app_name=' + encodeURIComponent(APP_NAME)
				 + '&title=' + encodeURIComponent(memoTitle.value)
				 + '&body=' + encodeURIComponent(memoBody.value);

		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
		xhr.send(param);
	};




	 /**
	 * 一覧の取得
	 * URL:http://cshooljs.dynalogue.com/api/data/?app_name=[アプリ名]
	 * リクエストメソッド:GET
	 */
	 var getMemoList = function() {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					var json = JSON.parse(xhr.responseText);

					//メモ一覧の表示
					createMemoList(json);

				} else {
					//異常系処理
					var alertTxt = '読み込みエラーが<br>発生しました。';
					showAlert(alertTxt, 'caution');
				}
			}
		};

		xhr.open('GET', ENDPOINT+'?app_name='+ encodeURIComponent(APP_NAME));
		xhr.send(null);
	};



	/**
	 * 1件取得
	 * URL:http://cshooljs.dynalogue.com/api/data/[id]/
	 * リクエストメソッド:GET
	 */
	var getEditMemo = function(id) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					var json = JSON.parse(xhr.responseText);

					//編集画面を表示
					showEdit(event, json);

				} else {
					//異常系処理
					var alertTxt = 'エラーが発生しました。';
					showAlert(alertTxt, 'caution');
				}
			}
		};

		xhr.open('GET', ENDPOINT + id + '/');
		xhr.send(null);
	};



	/**
	 * 変更
	 * URL:http://cshooljs.dynalogue.com/api/data/
	 * リクエストメソッド:PUT
	 */
	var putEditMemo = function(event) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				if(xhr.status === 200) {

					//編集画面を閉じる
					closeEdit();

					//メモ一覧を再読み込み
					getMemoList();

					//投稿完了表示
					var successTxt = 'メモを編集しました。';
					showAlert(successTxt, 'message');

					//一時保存情報をストレージから削除
					window.localStorage.removeItem('memoId');
					window.localStorage.removeItem('memoTitle');
					window.localStorage.removeItem('memoBody');

				} else {
					//異常系処理
					if (memoBody.value === '') {
						//本文が空の場合
						var alertTxt = '本文を<br>入力してください。';
						showAlert(alertTxt, 'caution');
					} else {
						var alertTxt = 'エラーが<br>発生しました。';
						showAlert(alertTxt, 'caution');
					}
				}
			}
		};

		//対象の記事のIDを取得
		var id = document.getElementById('edit_buttons').getAttribute('data-memoId');
		xhr.open('PUT', ENDPOINT + id + '/');

		//パラメータ生成
		var param = 'app_name=' + encodeURIComponent(APP_NAME)
				 + '&title=' + encodeURIComponent(memoTitle.value)
				 + '&body=' + encodeURIComponent(memoBody.value);

		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
		xhr.send(param);
	};



	/**
	 * 削除
	 * URL:http://cshooljs.dynalogue.com/api/data/[id]/?app_name=[アプリ名]
	 * リクエストメソッド:DELETE
	 */
	var deleteMemo = function(id) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				if(xhr.status === 200) {
					
					//マスクと確認画面を非表示
					mask.style.display = 'none';
					memoConfirm.style.display = 'none';

					//メモ一覧を再読み込み
					getMemoList();

					//投稿完了表示
					var successTxt = 'メモを削除しました。';
					showAlert(successTxt, 'message');

				} else {
					//異常系処理
					var alertTxt = 'エラーが<br>発生しました。';
					showAlert(alertTxt, 'caution');
				}
			}
		};

		//対象の記事のIDを取得
		xhr.open('DELETE', ENDPOINT + id + '/?app_name=' + encodeURIComponent(APP_NAME));
		xhr.send(null);
	}

})();
