javascript:
if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {

    document.addEventListener("DOMContentLoaded", function () {
        var menu = document.querySelectorAll('ul.menu > li.submenu');

        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            for (var i = 0; i < menu.length; i++) {
                var li = menu[i];
                li.onmouseover = onliClick;
                li.onmousedown = onlidown;
            }

            function onlidown(event) {
                var lis = document.querySelectorAll('ul.menu > li.submenu');
                var k = 1;
                var target = event ? event.target : window.event.srcElement;

                for (var i = 0; i < lis.length; i++) {
                    if (target.parentNode == lis[i]) { k = k + i; break; }
                }

                target.nextElementSibling.style.display = 'block';
                var m = target.parentNode.firstElementChild.nextElementSibling.children.length;
                document.getElementById('black_block').style.display = 'block';
                document.getElementById('black_block').style.height = 35 * k + 'px';
                document.getElementById('black_block_bottom').style.display = 'block';
                document.getElementById('black_block_bottom').style.top = 35 * k + 36 * m + 'px';
                document.getElementsByTagName('body')[0].style.overflow = 'hidden';
                document.getElementsByClassName('main_table')[0].style.overflow = 'hidden';
            }

            document.addEventListener('touchmove', function (e) {
                if (document.getElementById('black_block_bottom').style.display == 'block') { e.preventDefault(); }

                document.getElementById('black_block').style.display = 'none';
                document.getElementById('black_block_bottom').style.display = 'none';
                document.getElementsByTagName('body')[0].style.overflow = 'auto';
                document.getElementsByClassName('main_table')[0].style.overflow = '';

                var lis = document.querySelectorAll('ul.menu > li.submenu > ul.submenu');

                for (var i = 0; i < lis.length; i++) {
                    if (lis[i].style.display == 'block') { lis[i].style.display = 'none'; break; }
                }

            }, true);

            function onliClick(event) {
                var lis = document.querySelectorAll('ul.menu > li.submenu');
                var k = 1;
                var target = event ? event.target : window.event.srcElement;

                for (var i = 0; i < lis.length; i++) {
                    if (target.parentNode == lis[i]) { k = k + i; break; }
                }

                target.nextElementSibling.style.display = 'block';
                var m = target.parentNode.firstElementChild.nextElementSibling.children.length;
                document.getElementById('black_block').style.display = 'block';
                document.getElementById('black_block').style.height = 35 * k + 'px';
                document.getElementById('black_block_bottom').style.display = 'block';
                document.getElementById('black_block_bottom').style.top = 35 * k + 36 * m + 'px';
                document.getElementsByTagName('body')[0].style.overflow = 'hidden';
                document.getElementsByClassName('main_table')[0].style.overflow = 'hidden';
            }
        }

        if (/Android/i.test(navigator.userAgent)) {

            for (var i = 0; i < menu.length; i++) {
                var li = menu[i];
                li.onclick = onliClick;
            }

            function onliClick(event) {
                var lis = document.querySelectorAll('ul.menu > li.submenu');
                var k = 1;
                var target = event ? event.target : window.event.srcElement;

                for (var i = 0; i < lis.length; i++) {
                    if (target.parentNode == lis[i]) { k = k + i; break; }
                }

                var m = target.parentNode.firstElementChild.nextElementSibling.children.length;

                document.getElementById('black_block').style.display = 'block';
                document.getElementById('black_block').style.height = 34.2 * k + 'px';
                document.getElementById('black_block_bottom').style.display = 'block';
                document.getElementById('black_block_bottom').style.top = 34.2 * k + 36 * m + 'px';
                document.getElementsByTagName('body')[0].style.overflow = 'hidden';
                document.getElementsByClassName('main_table')[0].style.overflow = 'hidden';
            }

        }

        document.getElementById("black_block").onclick = function DelBlackBlocks(event) {
            document.getElementById('black_block').style.display = 'none';
            document.getElementById('black_block_bottom').style.display = 'none';
            document.getElementsByTagName('body')[0].style.overflow = 'auto';
            document.getElementsByClassName('main_table')[0].style.overflow = '';
            var lis = document.querySelectorAll('ul.menu > li.submenu > ul.submenu');

            for (var i = 0; i < lis.length; i++) {
                if (lis[i].style.display == 'block') { lis[i].style.display = 'none'; break; }
            }
        }

        document.getElementById("black_block_bottom").onclick = function DelBlackBlocks(event) {
            document.getElementById('black_block').style.display = 'none';
            document.getElementById('black_block_bottom').style.display = 'none';
            document.getElementsByTagName('body')[0].style.overflow = 'auto';
            document.getElementsByClassName('main_table')[0].style.overflow = '';
            var lis = document.querySelectorAll('ul.menu > li.submenu > ul.submenu');
            for (var i = 0; i < lis.length; i++) {
                if (lis[i].style.display == 'block') { lis[i].style.display = 'none'; break; }
            }
        }

        var topheadtabl = document.getElementsByClassName('mytitle')[0].getBoundingClientRect().bottom - 3;
        var topbodytable = topheadtabl + document.getElementById('tabl_head_1').getBoundingClientRect().bottom - document.getElementById('tabl_head_1').getBoundingClientRect().top;

        function fixed_menu() {
            if (screen.width > 480 || document.body.offsetWidth > 480) {
                document.getElementsByTagName('body')[0].scrollTop = 0
                document.getElementsByTagName('body')[0].style.overflow = 'hidden';
                document.getElementById('tabl_head_1').style.positon = '';
                document.getElementById('tabl_head_1').style.top = '';
                document.getElementById('plav').style.width = '';
                document.getElementById('plav').style.position = '';
                document.getElementById('plav').style.zIndex = '';
                document.getElementById('plav').style.top = '';
                document.getElementsByClassName('mytitle')[0].style.width = '';
                document.getElementsByClassName('mytitle')[0].style.position = '';
                document.getElementsByClassName('mytitle')[0].style.zIndex = '';
                document.getElementById('tabl_body_1').style.position = '';
                document.getElementById('tabl_body_1').style.top = '';
                document.getElementById('black_block').style.display = 'none';
                document.getElementById('black_block_bottom').style.display = 'none';
                document.getElementsByTagName('body')[0].style.overflow = 'auto';
                document.getElementsByClassName('main_table')[0].style.overflow = '';
            }
            else {
                document.getElementById('tabl_head_1').style.positon = 'relative';
                document.getElementById('tabl_head_1').style.top = topheadtabl + "px";
                document.getElementById('plav').style.width = '100%';
                document.getElementById('plav').style.position = 'fixed';
                document.getElementById('plav').style.zIndex = '1';
                document.getElementById('plav').style.top = topheadtabl + "px";
                document.getElementsByClassName('mytitle')[0].style.width = '100%';
                document.getElementsByClassName('mytitle')[0].style.position = 'fixed';
                document.getElementsByClassName('mytitle')[0].style.zIndex = '10';
                document.getElementById('tabl_body_1').style.position = 'relative';
                document.getElementById('tabl_body_1').style.top = topbodytable + "px";
            }
            setTimeout(fixed_menu, 5);
        }

        var elements = document.getElementsByClassName('glav_tab')
        var scroll = elements[0].scrollLeft;

        fixed_menu();
    });
};