# D3REAM
　　D3REAM (Data-Driven Design for Renewable Energy Advanced Materials) is a energy material design tool.

<p align="center">
<img src="{{ url_for('static', filename='images/3DREAM/D3REAM.svg') }}" width="80%"/>
</p>

## Introduction
D3REAM mainly consists of three parts:
  
##### 1. Database construction. 
　　D3REAM can obtain data on the crystal structure and properties of energy materials from existing databases, literature data and high-throughput calculations, and clean and integrate the data to form a high-quality database.

##### 2. Crystal structure prediction. 
　　Based on the D3REAM database, using machine learning methods, the crystal structure and properties are quickly and accurately predicted from the chemical composition of materials.

##### 3. Design new materials. 
　　According to the required target material properties, based on the D3REAM database, using DFT combined with active machine learning methods, D3REAM can reverse design the composition and crystal structure of candidate materials corresponding to the target material properties.

## System requirements
- Python >= 3.6
- tensorflow >= 2.3.0
- megnet >= 1.1.8
- hyperopt >= 0.2.4
- bayesian-optimization >= 1.2.0
- sko(scikit-opt) >= 0.6.1
- pymysql >= 1.10.0
- pymatgen >= 2020.8.3

## Code availability
　　Code is available upon request.


## Copyright

<p align="center">
<img src="{{ url_for('static', filename='images/3DREAM/DREAM_copyright.jpg') }}" width="60%"/>
</p>
