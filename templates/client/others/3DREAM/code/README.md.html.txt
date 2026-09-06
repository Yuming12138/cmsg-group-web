<h1>D3REAM</h1>

<p>　　D3REAM is a $\textit{de novo}$ inverse materials design (DNID) approach that fully automates the materials design for target physical properties, without the need to provide atomic composition, chemical stoichiometry, and crystal structure in advance.</p>

<h2>System requirements</h2>

<ul>
<li>Python &gt;= 3.9</li>
<li>scikit-opt == 0.6.6</li>
<li>hyperopt == 0.2.7</li>
<li>optuna == 3.3.0</li>
<li>megnet == 1.3.2</li>
<li>tensorflow == 2.9.3</li>
<li>ase == 3.22.1</li>
<li>m3gnet == 0.2.4</li>
<li>pymatgen == 2023.10.11</li>
</ul>

<h2>Getting started</h2>

<p>We provide the examples of D3REAM for the inverse design materials with target properties. The examples show at the path <code>D3REAM/example</code>.</p>

<ul>
<li><code>0.input_file</code> shows the input parameters of D3REAM.</li>
<li><code>1.UPot-BO</code> shows the examples of D3REAM for the inverse design materials with high cohesive energy and bulk modulus by using the UPot-BO method.</li>
<li><code>2.UPot-CHEERS</code> shows the examples of D3REAM for the inverse design materials with high cohesive energy and thermal expansion by using the UPot-CHEERS method.</li>
</ul>

<h2>The details of input parameters of D3REAM</h2>
<div class="highlight"><pre><span></span><span class="p">[</span><span class="n">BASE</span><span class="p">]</span>

<span class="c1"># The chemical formula of the compound, element symbol + count, i.e., Ca4 S4, Cs1 Pb1 I3</span>
<span class="c1"># compound = Ca4 S4</span>

<span class="c1"># [2] / [1-10] / [1-10, 15] / [1-10, 15-20] / [1, 5-10, 15, 16]</span>
<span class="n">atom_element</span> <span class="o">=</span> <span class="p">[</span><span class="mi">1</span><span class="p">,</span><span class="mi">3</span><span class="o">-</span><span class="mi">9</span><span class="p">,</span><span class="mi">11</span><span class="o">-</span><span class="mi">17</span><span class="p">,</span><span class="mi">19</span><span class="o">-</span><span class="mi">22</span><span class="p">,</span><span class="mi">29</span><span class="o">-</span><span class="mi">35</span><span class="p">,</span><span class="mi">37</span><span class="o">-</span><span class="mi">40</span><span class="p">,</span><span class="mi">47</span><span class="o">-</span><span class="mi">53</span><span class="p">,</span><span class="mi">55</span><span class="o">-</span><span class="mi">56</span><span class="p">,</span><span class="mi">81</span><span class="o">-</span><span class="mi">83</span><span class="p">]</span> <span class="p">[</span><span class="mi">1</span><span class="p">,</span><span class="mi">3</span><span class="o">-</span><span class="mi">9</span><span class="p">,</span><span class="mi">11</span><span class="o">-</span><span class="mi">17</span><span class="p">,</span><span class="mi">19</span><span class="o">-</span><span class="mi">22</span><span class="p">,</span><span class="mi">29</span><span class="o">-</span><span class="mi">35</span><span class="p">,</span><span class="mi">37</span><span class="o">-</span><span class="mi">40</span><span class="p">,</span><span class="mi">47</span><span class="o">-</span><span class="mi">53</span><span class="p">,</span><span class="mi">55</span><span class="o">-</span><span class="mi">56</span><span class="p">,</span><span class="mi">81</span><span class="o">-</span><span class="mi">83</span><span class="p">]</span>

<span class="c1"># [2] / [1-10] / [1-10, 15] / [1-10, 15-20] / [1, 5-10, 15, 16]</span>
<span class="n">atom_count</span> <span class="o">=</span> <span class="p">[</span><span class="mi">1</span><span class="o">-</span><span class="mi">5</span><span class="p">]</span> <span class="p">[</span><span class="mi">1</span><span class="o">-</span><span class="mi">5</span><span class="p">]</span>

<span class="c1"># use or nor search children cell</span>
<span class="n">use_children_cell</span> <span class="o">=</span> <span class="kc">True</span>

<span class="c1"># limit the max atomic distance</span>
<span class="c1">#   1) min_atomic_dist_limit = 0, no limit;</span>
<span class="c1">#   2) min_atomic_dist_limit &lt; 0, relative distance, dist_ab &lt; (radii_a+radii_b)*abs(min_atomic_dist_limit);</span>
<span class="c1">#   3) min_atomic_dist_limit &gt; 0, absolute distance (unit: Angstrom), dist_ab &lt; min_atomic_dist_limit</span>
<span class="n">min_atomic_dist_limit</span> <span class="o">=</span> <span class="o">-</span><span class="mf">0.7</span>

<span class="c1"># [min_V, max_V], limit cell volume size; if `volume_limit = [0, 0 ]`, no limit</span>
<span class="n">volume_limit</span> <span class="o">=</span> <span class="p">[</span><span class="mi">0</span><span class="p">,</span> <span class="mi">0</span><span class="p">]</span>

<span class="c1"># limit the max vacuum size (unit: Angstrom); if `max_vacuum_limit = 0`, no limit</span>
<span class="n">max_vacuum_limit</span> <span class="o">=</span> <span class="mf">5.0</span>

<span class="c1"># Output path, use to save the results.</span>
<span class="n">output_path</span> <span class="o">=</span> <span class="o">.</span>

<span class="p">[</span><span class="n">CALCULATOR</span><span class="p">]</span>

<span class="c1"># megnet, m3gnet, vasp</span>
<span class="n">calculator</span> <span class="o">=</span> <span class="n">m3gnet</span>

<span class="c1"># The GN model file path, it is better to use absolute path.</span>
<span class="n">calculator_path</span> <span class="o">=</span> <span class="n">F</span><span class="p">:</span>\<span class="n">d3ream</span>\<span class="n">calculators</span>\<span class="n">m3gnet</span>\<span class="n">origin_model</span>\<span class="n">EFS2021</span>

<span class="c1"># relax or not</span>
<span class="n">use_calculator_relax</span> <span class="o">=</span> <span class="kc">True</span>

<span class="c1"># keep symmetry or not, when relax structure</span>
<span class="n">use_keep_symmetry</span> <span class="o">=</span> <span class="kc">True</span>

<span class="c1"># symmetry precicion</span>
<span class="n">symprec</span> <span class="o">=</span> <span class="mf">0.001</span>

<span class="c1"># Load model and predict using GPU</span>
<span class="n">use_gpu</span> <span class="o">=</span> <span class="kc">False</span>

<span class="p">[</span><span class="n">OPTIMIZER</span><span class="p">]</span>

<span class="c1"># Search algorithm: 1) &#39;rand&#39; (Random Search); 2) &#39;tpe&#39; (Bayesian Optimization);</span>
<span class="c1">#                   3) &#39;pso&#39; (Particle Swarm Optimization);</span>
<span class="c1">#                   4) &#39;etpe&#39;</span>
<span class="c1">#                   5) `tpe2` (Bayesian Optimization)</span>
<span class="n">algorithm</span> <span class="o">=</span> <span class="n">tpe2</span>

<span class="c1"># The count of initial random points, only valid when the algorithm is tpe</span>
<span class="n">n_init</span> <span class="o">=</span> <span class="mi">200</span>

<span class="c1"># The maximum steps of program runs</span>
<span class="n">max_step</span> <span class="o">=</span> <span class="mi">5000</span>

<span class="c1"># Specify the random seed, -1 is None</span>
<span class="n">rand_seed</span> <span class="o">=</span> <span class="mi">100</span>

<span class="c1"># TODO support future</span>
<span class="n">use_resume</span> <span class="o">=</span> <span class="kc">False</span>

<span class="c1"># only support `tpe2`</span>
<span class="n">n_mpi</span> <span class="o">=</span> <span class="mi">1</span>

<span class="c1"># Database URL, only n_mpi&gt;=2</span>
<span class="n">storage</span> <span class="o">=</span> <span class="s1">&#39;&#39;</span>

<span class="p">[</span><span class="n">LATTICE</span><span class="p">]</span>

<span class="c1"># [2] / [1-10] / [1-10, 15] / [1-10, 15-20] / [1, 5-10, 15, 16]</span>
<span class="n">space_group</span> <span class="o">=</span> <span class="p">[</span><span class="mi">1</span><span class="o">-</span><span class="mi">230</span><span class="p">]</span>

<span class="c1"># Generate WyckPos site: 1) 1 -&gt; Generate `max_wyck_pos_count` WyckPos combinations before optimization;</span>
<span class="c1">#                        2) 2 -&gt; Generate all WyckPos combinations after optimization (not recommended when the number of atoms &gt; 15);</span>
<span class="c1">#                        3) 3 -&gt; Generate WyckPos by optimization algorithms with random site ([&#39;a&#39;, &#39;a&#39;, &#39;b&#39;, &#39;b&#39;, [rand], ...]);</span>
<span class="c1">#                        4) 4 -&gt; Generate WyckPos by optimization algorithms strictly ([&#39;a&#39;, &#39;a&#39;, &#39;b&#39;, &#39;b&#39;]);</span>
<span class="n">wyck_pos_gen</span> <span class="o">=</span> <span class="mi">3</span>

<span class="c1"># The maximum count of WyckPos combinations, only valid when `wyck_pos_gen = 1`</span>
<span class="n">max_wyck_pos_count</span> <span class="o">=</span> <span class="mi">200000</span>

<span class="c1"># use or nor flexible WyckPos site (# TODO delete)</span>
<span class="c1"># use_flexible_site = True</span>
<span class="c1"># Lattice a,b,c (unit: Angstrom):</span>
<span class="c1"># [2] / [1-10] / [1-10, 15] / [1-10, 15-20] / [1, 5-10, 15, 16]</span>
<span class="n">lattice_a</span> <span class="o">=</span> <span class="p">[</span><span class="mi">2</span><span class="o">-</span><span class="mi">30</span><span class="p">]</span>
<span class="n">lattice_b</span> <span class="o">=</span> <span class="p">[</span><span class="mi">2</span><span class="o">-</span><span class="mi">30</span><span class="p">]</span>
<span class="n">lattice_c</span> <span class="o">=</span> <span class="p">[</span><span class="mi">2</span><span class="o">-</span><span class="mi">30</span><span class="p">]</span>

<span class="c1"># Lattice alpha,beta,gamma (unit: degree):</span>
<span class="c1"># [2] / [1-10] / [1-10, 15] / [1-10, 15-20] / [1, 5-10, 15, 16]</span>
<span class="n">lattice_alpha</span> <span class="o">=</span> <span class="p">[</span><span class="mi">20</span><span class="o">-</span><span class="mi">160</span><span class="p">]</span>
<span class="n">lattice_beta</span> <span class="o">=</span> <span class="p">[</span><span class="mi">20</span><span class="o">-</span><span class="mi">160</span><span class="p">]</span>
<span class="n">lattice_gamma</span> <span class="o">=</span> <span class="p">[</span><span class="mi">20</span><span class="o">-</span><span class="mi">160</span><span class="p">]</span>

<span class="c1"># float</span>
<span class="c1"># lattice_precision = 0.1</span>
</pre></div>

<h2>Cite</h2>

<p>　　If you use D3REAM for research, please consider citing our paper.</p>
