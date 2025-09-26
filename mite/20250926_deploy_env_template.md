# デプロイ環境 提供用テンプレート

デプロイ環境に関する注意事項  

* リリース前の開発環境でのデプロイが前提となります
* backup, 冗長化, マルチテナントは考慮には入れていません  
* AWSのマネージメントコンソールは開放していません(※必要に応じてご相談下さい)
* VPCやAZなどは既存のものを使用して下さい  

## インフラ側 引き渡しパラメーター項目（インフラ記入）
```
1. 基本情報

・ AWSアカウント：527068389645  
・ リージョン情報：ap-northeast-1  

2. IAM情報

・ User：BL-deploy01  
・ アクセスキー：[MASKED - インフラチームから提供]
・ シークレットキー：[MASKED - インフラチームから提供]  

3. ネットワーク構成

・ VPC情報：172.19.0.0/16　vpc-0d9e0881a77d26ab0  
・ AZ情報 / サブネット情報:  
  - BL-Private-AZ1：172.19.101.0/24　subnet-063f4e8c3fa853f49　apne1-az1 (ap-northeast-1c)  
  - BL-Private-AZ2：172.19.102.0/24　subnet-069a7acf5cbca5a66　apne1-az2 (ap-northeast-1d)  
  - BL-Public-AZ1：172.19.103.0/24　subnet-02a78d88f6bf1e90e　apne1-az1 (ap-northeast-1c)  
  - BL-Public-AZ2：172.19.104.0/24　subnet-0d515cb39300d85f5　apne1-az2 (ap-northeast-1d)  

4. コンピューティング環境(EC2)

・ インスタンスID：i-065d5b574c30d9c67 
・ インスタンス名：Bl-glasses-01-env
・ インスタンスIP：172.19.101.201
・ VPCID：vpc-0d9e0881a77d26ab0  
・ ALB-DNS：http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/
・ Auto Scaling グループ名：awseb-e-y3vyktafu4-stack-AWSEBAutoScalingGroup-PpI0NIM9r69J  
・ EC2ログイン名：ec2-user  
・ EC2パスワード:Googleドライブから「.pem」ファイルをローカルにコピーして下さい (https://drive.google.com/drive/folders/12_IFXqoN1KZnpRO9QtobC29e9nc9NlEz?usp=drive_link)  

5. 共通リソース

・ ALB：BL-Common-ALB1   
```
  ---
### 手動接続時のコマンド例
```bash
# --- Linux / Mac から EC2 接続 ---
ssh -i {pemファイル}.pem ec2-user@xxx.xxx.xxx.xxx

# --- Windows (PowerShell) から EC2 接続 ---
ssh -i {pemファイル}.pem ec2-user@xxx.xxx.xxx.xxx

# --- AWS SSM Session Manager 経由で EC2 接続 ---
aws ssm start-session --target i-xxxxxxxxxxxxxxxxx

# --- MySQL DB 接続 ---
mysql -h xxxx.cluster-xxxxxxxx.ap-northeast-1.rds.amazonaws.com -u {DBユーザー名} -p

# --- PostgreSQL DB 接続 ---
psql -h xxxx.cluster-xxxxxxxx.ap-northeast-1.rds.amazonaws.com -U {DBユーザー名} -d {DB名}
```
