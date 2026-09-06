import pickle

from flask import Flask, render_template, request, send_from_directory, current_app, jsonify
from datetime import timedelta
import os
import datetime
import pandas as pd

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = timedelta(seconds=1)
app.jinja_env.auto_reload = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SECRET_KEY'] = 'chengguanjian'


@app.route('/')
def home():
    return render_template('client/index.html')


@app.route('/pi')
def wanjian_yin():
    return render_template('client/wanjian_yin.html')


@app.route('/research')
def research():
    return render_template('client/research.html')


@app.route('/publications')
def publications():
    return render_template('client/publications.html')


@app.route('/members')
def members():
    return render_template('client/members.html')


@app.route('/group_photo')
def group_photo():
    return render_template('client/group_photo.html')


@app.route('/contact')
def contact():
    return render_template('client/contact.html', baidu_map_ak='AFYgGLCH54kcf5GxgK8MWGqVR2aFKwRy')


@app.route('/robots.txt')
@app.route('/sitemap.xml')
@app.route('/sitemap.html')
def static_from_root():
    return send_from_directory(current_app.static_folder, request.path[1:])


@app.route('/U2FsdGVkX1+8Uk+eHxMSeUW8oFuVWFlhnMudufDzP9Q=', methods=['POST', ])
def my_app():
    if request.method != 'POST':
        return 'hello word!'

    tuiguang = []
    page_count = 15
    page = int(request.args.get('page', type=int, default=1))
    print('cheng', str(page))

    base_dir = os.path.dirname(__file__)
    data_files_path = os.path.join(base_dir, 'static/my_app')
    all_files = os.listdir(data_files_path)
    if not all_files:
        return 'hello word!'
    else:
        all_files = sorted(all_files, key=lambda x: os.path.getmtime(os.path.join(data_files_path, x)))[::-1]
    tuiguang_file = [jf for jf in all_files if '.pkl' in jf]

    now_date = str(datetime.datetime.now().strftime("%Y-%m-%d"))
    if len(tuiguang_file) == 1 and tuiguang_file[0].split('.')[0] == now_date:
        tuiguang_file_path = os.path.join(data_files_path, tuiguang_file[0])
        with open(tuiguang_file_path, 'rb') as f:
            tuiguang = pickle.load(f)
            tuiguang = tuiguang[(page - 1) * page_count:page * page_count]
            return jsonify(tuiguang)

    if len(tuiguang_file) >= 1:
        for i in tuiguang_file:
            os.remove(os.path.join(data_files_path, i))

    for xf in all_files:
        if '.xls' not in xf:
            continue

        xf_path = os.path.join(data_files_path, xf)
        df = pd.read_excel(xf_path).values
        xf_i_goods_count = 0
        for dd in df:
            tg_i = {}
            if pd.np.nan in [dd[1], dd[2], dd[4], dd[5], dd[6], dd[11], dd[15], dd[16], dd[17], dd[18]]:
                continue
            if not (dd[16] <= str(datetime.datetime.now()) <= dd[17]):
                continue
            tg_i['goods_name'] = dd[1]  # 商品名称
            tg_i['goods_image'] = dd[2]  # 商品主图
            tg_i['store_name'] = dd[4]  # 店铺名称
            tg_i['goods_price'] = dd[5]  # 商品价格
            tg_i['goods_sales'] = dd[6]  # 商品月销量
            tg_i['taobaoke_url'] = dd[11]  # 淘宝客链接
            tg_i['youhuiquan_value'] = dd[15]  # 优惠券面额
            tg_i['youhuiquan_start_time'] = dd[16]  # 优惠券开始时间
            tg_i['youhuiquan_end_time'] = dd[17]  # 优惠券结束时间
            tg_i['youhuiquan_url'] = dd[18]  # 优惠券链接
            tuiguang.append(tg_i)

            xf_i_goods_count += 1

        if xf_i_goods_count == 0:
            os.remove(xf_path)

    with open(os.path.join(data_files_path, now_date + '.pkl'), 'wb') as f:
        pickle.dump(tuiguang, f, protocol=4)
    tuiguang = tuiguang[(page - 1) * page_count:page * page_count]
    return jsonify(tuiguang)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
