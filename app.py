import pickle

import os
from flask import Flask, render_template, request, send_from_directory, current_app, jsonify, Response, url_for
# from flask import g
from flask import session as g
# from datetime import timedelta
# from flask_babel import Babel, gettext as _
import os
import time
import random
import datetime
import pandas as pd

app = Flask(__name__)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = timedelta(seconds=1)
app.jinja_env.auto_reload = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'development-only-insecure-key')
# app.config['BABEL_DEFAULT_LOCALE'] = 'zh'

base_dir = os.path.dirname(__file__)


def get_user_info(page='', pp=''):
    if pp is None:
        pp = ''
    local_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    if request.headers.getlist("X-Forwarded-For"):
        ips = request.headers.getlist("X-Forwarded-For")[0].replace(' ', '').replace('unknown', '')
    else:
        ips = request.remote_addr
    with open('./log.csv', 'a+') as f:
        for ip in ips.split(','):
            if '.' in ip:
                f.writelines(','.join([local_time, ip, page, pp]) + '\n')


@app.context_processor  # 上下文渲染器，给所有html添加渲染参数
def inject_url():
    data = {
        "url_for": dated_url_for,
    }
    return data


def dated_url_for(endpoint, **values):
    filename = None
    if endpoint == 'static':
        filename = values.get('filename', None)
    if filename:
        file_path = os.path.join(app.root_path, endpoint, filename)
        if os.path.exists(file_path):
            values['v'] = int(os.stat(file_path).st_mtime)  # 取文件最后修改时间的时间戳，文件不更新，则可用缓存
    return url_for(endpoint, **values)


@app.route('/')
def home():
    get_user_info(page='client/index.html')
    language = request.args.get('language', type=str, default='').lower()
    use_en = g.get('use_en', False)
    if language == 'en' or use_en:
        g['use_en'] = True
        return render_template('client/EN/index.html', page='home', use_en=True)
    return render_template('client/index.html', page='home', use_en=use_en)


@app.route('/pi')
def wanjian_yin():
    get_user_info(page='client/wanjian_yin.html')
    language = request.args.get('language', type=str, default='').lower()
    use_en = g.get('use_en', False)
    if language == 'en' or use_en:
        g['use_en'] = True
        return render_template('client/EN/wanjian_yin.html', page='pi', use_en=True)
    return render_template('client/wanjian_yin.html', page='pi', use_en=use_en)


@app.route('/research')
def research():
    get_user_info(page='client/research.html')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template('client/research.html', page='research', use_en=g.get('use_en', False))


@app.route('/publications')
def publications():
    get_user_info(page='client/publications.html')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template('client/publications.html', page='publications', use_en=g.get('use_en', False))


@app.route('/members/', defaults={'mem_id': None})
@app.route('/members/<mem_id>')
def members(mem_id):
    get_user_info(page='client/members.html', pp=mem_id)
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    if mem_id:
        return render_template(f'client/members_info/{mem_id}/jieshao.html', page='members', use_en=g.get('use_en', False))
    else:
        return render_template('client/members.html', page='members', use_en=g.get('use_en', False))


@app.route('/members/zhouke/work_1.html')
def zhouke_work_1():
    get_user_info(page='client/members_info/zhouke/work_1.html', pp='zhouke')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template(
        'client/members_info/zhouke/work_1.html',
        page='members',
        use_en=g.get('use_en', False),
    )


@app.route('/members/zhouke/work_2.html')
def zhouke_work_2():
    get_user_info(page='client/members_info/zhouke/work_2.html', pp='zhouke')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template(
        'client/members_info/zhouke/work_2.html',
        page='members',
        use_en=g.get('use_en', False),
    )


@app.route('/members/zhouke/work_3.html')
def zhouke_work_3():
    get_user_info(page='client/members_info/zhouke/work_3.html', pp='zhouke')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template(
        'client/members_info/zhouke/work_3.html',
        page='members',
        use_en=g.get('use_en', False),
    )


@app.route('/members/zhouke/work_4.html')
def zhouke_work_4():
    get_user_info(page='client/members_info/zhouke/work_4.html', pp='zhouke')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template(
        'client/members_info/zhouke/work_4.html',
        page='members',
        use_en=g.get('use_en', False),
    )


# @app.route('/members/<mem_id>')
# def member_info(mem_id):
#     get_user_info(page=f'client/members_info/{mem_id}/jieshao.html', pp=mem_id)
#     language = request.args.get('language', type=str, default='').lower()
#     if language == 'en':
#         g['use_en'] = True
#     return render_template(f'client/members_info/{mem_id}/jieshao.html', use_en=g.get('use_en', False))


@app.route('/group_photo')
def group_photo():
    get_user_info(page='client/group_photo.html')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template('client/group_photo.html', page='group_photo', use_en=g.get('use_en', False))


@app.route('/contact')
def contact():
    get_user_info(page='client/contact.html')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template('client/contact.html', page='contact', baidu_map_ak=os.environ.get('BAIDU_MAP_AK', ''), use_en=g.get('use_en', False))


@app.route('/links', methods=['POST', 'GET'])
def links():
    software = request.args.get('software', type=str, default='')
    get_user_info(page='client/links.html', pp=software)
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    if software == 'gn_oa':
        return render_template('client/others/GN-OA/GN-OA.html', use_en=g.get('use_en', False))
    elif software == 'd3ream':
        return render_template('client/others/3DREAM/code/D3REAM.html', use_en=g.get('use_en', False))
    return render_template('client/links.html', page='links', use_en=g.get('use_en', False))


@app.route('/software/3DREAM')
def D3REAM():
    get_user_info(page='client/others/3DREAM/3DREAM.html')
    language = request.args.get('language', type=str, default='').lower()
    if language == 'en':
        g['use_en'] = True
    return render_template('client/others/3DREAM/3DREAM.html', use_en=g.get('use_en', False))


@app.route('/set_language', methods=['POST'])
def set_language():
    # g.use_en = request.form['language']
    use_en = request.form['language']
    if use_en and use_en.lower() == 'true':
        g['use_en'] = True
    else:
        g['use_en'] = False
    print(g.get('use_en', False))

    return {'state': 'OK'}


@app.route('/robots.txt')
@app.route('/sitemap.xml')
@app.route('/sitemap.html')
@app.route('/baidu-verify-B476BB7F2F.txt')
def static_from_root():
    return send_from_directory(current_app.static_folder, request.path[1:])


@app.route('/download', methods=['GET', 'POST'])
def download():
    if request.method == 'GET':
        filename = request.args.get('filename', type=str, default='')
        get_user_info(page='download', pp=filename)
        file_path = os.path.join(base_dir, 'static/download', filename)
        if not os.path.exists(file_path):
            return "This file is not exist!"

        # 普通下载
        # response = make_response(send_from_directory(filepath, filename, as_attachment=True))
        # response.headers["Content-Disposition"] = "attachment; filename={}".format(filepath.encode().decode('latin-1'))
        # return send_from_directory(filepath, filename, as_attachment=True)
        # 流式读取
        def send_file():
            store_path = file_path
            with open(store_path, 'rb') as targetfile:
                while 1:
                    data = targetfile.read(20 * 1024 * 1024)  # 每次读取20M
                    if not data:
                        break
                    yield data

        response = Response(send_file(), content_type='application/octet-stream')
        response.headers["Content-disposition"] = 'attachment; filename=%s' % filename  # 如果不加上这行代码，导致下图的问题
        return response


# @app.route('/U2FsdGVkX1+8Uk+eHxMSeUW8oFuVWFlhnMudufDzP9Q=', methods=['POST', ])
# def my_app():
#     if request.method != 'POST':
#         return 'hello word!-1'
#
#     tuiguang = []
#     page_count = 20
#     page = int(request.args.get('page', type=int, default=1))
#     print('cheng', str(page))
#
#     data_files_path = os.path.join(base_dir, 'static/my_app')
#     if not os.path.isdir(data_files_path):
#         os.makedirs(data_files_path)
#     all_files = os.listdir(data_files_path)
#     # if not all_files:
#     #     return 'hello word!-2'
#     # else:
#     #     all_files = sorted(all_files, key=lambda x: os.path.getmtime(os.path.join(data_files_path, x)))[::-1]
#     tuiguang_file = [jf for jf in all_files if '.pkl' in jf]
#
#     now_date = str(datetime.datetime.now().strftime("%Y-%m-%d"))
#     if len(tuiguang_file) == 1 and tuiguang_file[0].split('.')[0] == now_date:
#         tuiguang_file_path = os.path.join(data_files_path, tuiguang_file[0])
#         with open(tuiguang_file_path, 'rb') as f:
#             tuiguang = pickle.load(f)
#             tuiguang = tuiguang[(page - 1) * page_count:page * page_count]
#             return jsonify(tuiguang)
#
#     if len(tuiguang_file) >= 1:
#         for i in tuiguang_file:
#             os.remove(os.path.join(data_files_path, i))
#
#     import top.api
#
#     appkey = os.environ.get('TAOBAO_APP_KEY', '')
#     secret = os.environ.get('TAOBAO_APP_SECRET', '')
#     req = top.api.TbkDgOptimusMaterialRequest()
#     req.set_app_info(top.appinfo(appkey, secret))
#     req.page_size = 100
#     req.adzone_id = "110778600061"
#     req.page_no = 1
#     req.material_id = "31519"
#     try:
#         resp = req.getResponse()
#         set_date = resp['tbk_dg_optimus_material_response']['result_list']['map_data'][0]['favorites_info']['favorites_list']['favorites_detail']
#         set_date = sorted(set_date, key=lambda x: x['favorites_title'], reverse=True)
#     except:
#         return 'hello word!-3'
#     for sd in set_date:
#         req.material_id = "31539"
#         req.favorites_id = sd['favorites_id']
#         for sdk_page in [1, 2]:
#             try:
#                 req.page_no = sdk_page
#                 resp = req.getResponse()
#                 goods_data = resp['tbk_dg_optimus_material_response']['result_list']['map_data']
#                 for gd in goods_data:
#                     tg_i = {}
#                     if not str(gd['coupon_start_time']) <= str(time.time() * 1000) <= str(gd['coupon_end_time']):
#                         continue
#                     tg_i['goods_name'] = gd['title']  # 商品名称
#                     tg_i['goods_image'] = "https:" + gd['pict_url']  # 商品主图
#                     tg_i['store_name'] = gd['shop_title']  # 店铺名称
#                     tg_i['goods_price'] = gd['zk_final_price']  # 商品价格
#                     tg_i['goods_sales'] = gd['volume']  # 商品月销量
#                     tg_i['taobaoke_url'] = "https:" + gd['click_url']  # 淘宝客链接
#                     tg_i['youhuiquan_value'] = gd['coupon_amount']  # 优惠券面额
#                     tg_i['youhuiquan_start_time'] = gd['coupon_start_time']  # 优惠券开始时间
#                     tg_i['youhuiquan_end_time'] = gd['coupon_end_time']  # 优惠券结束时间
#                     tg_i['youhuiquan_url'] = "https:" + gd['coupon_click_url']  # 优惠券链接
#                     tuiguang.append(tg_i)
#             except:
#                 pass
#
#     # for xf in all_files:
#     #     if '.xls' not in xf:
#     #         continue
#     #
#     #     xf_path = os.path.join(data_files_path, xf)
#     #     df = pd.read_excel(xf_path).values
#     #     xf_i_goods_count = 0
#     #     for dd in df:
#     #         tg_i = {}
#     #         if pd.np.nan in [dd[1], dd[2], dd[4], dd[5], dd[6], dd[11], dd[15], dd[16], dd[17], dd[18]]:
#     #             continue
#     #         if not (dd[16] <= str(datetime.datetime.now()) <= dd[17]):
#     #             continue
#     #         tg_i['goods_name'] = dd[1]  # 商品名称
#     #         tg_i['goods_image'] = dd[2]  # 商品主图
#     #         tg_i['store_name'] = dd[4]  # 店铺名称
#     #         tg_i['goods_price'] = dd[5]  # 商品价格
#     #         tg_i['goods_sales'] = dd[6]  # 商品月销量
#     #         tg_i['taobaoke_url'] = dd[11]  # 淘宝客链接
#     #         tg_i['youhuiquan_value'] = dd[15]  # 优惠券面额
#     #         tg_i['youhuiquan_start_time'] = dd[16]  # 优惠券开始时间
#     #         tg_i['youhuiquan_end_time'] = dd[17]  # 优惠券结束时间
#     #         tg_i['youhuiquan_url'] = dd[18]  # 优惠券链接
#     #         tuiguang.append(tg_i)
#     #
#     #         xf_i_goods_count += 1
#     #
#     #     if xf_i_goods_count == 0:
#     #         os.remove(xf_path)
#
#     random.shuffle(tuiguang)
#     with open(os.path.join(data_files_path, now_date + '.pkl'), 'wb') as f:
#         pickle.dump(tuiguang, f, protocol=4)
#     tuiguang = tuiguang[(page - 1) * page_count:page * page_count]
#     return jsonify(tuiguang)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
