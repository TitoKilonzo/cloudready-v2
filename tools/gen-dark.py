import re,sys
SRC=['src/style.css','src/portal.css','src/polish.css']
BG={'white':'#171830','#fff':'#171830','#ffffff':'#171830','#fdfcff':'#1c1d3a','#fcfbff':'#1c1d3a',
'#f7f5ff':'#1d1e3d','#f5f2ff':'#1d1e3d','#f8f6ff':'#1d1e3d','#faf9ff':'#1d1e3d',
'#f0edff':'#25264b','#f1edff':'#25264b','#f3f0ff':'#25264b','#f1eeff':'#25264b','#eee9ff':'#25264b','#efedff':'#25264b','#eeeaff':'#25264b','var(--lilac)':'#25264b',
'#e9e5ff':'#33346a','#e4dfff':'#2c2a63','#dcd4ff':'#33346a','var(--lilac2)':'#33346a','#ffffffed':'#171830ed',
'#d8d2f6':'#43448a','#cfc8f3':'#43448a','#a79aff':'#6a60dc',
'#eaf9f3':'#12332b','#fff4e9':'#382a16','#fff0f1':'#3a1620','#fff5f5':'#3a1620','#e3f6ef':'#14362c','#fff0e7':'#3a2616','#ffe3d7':'#3b2719','#d5f0e8':'#15362d','#e4dfff ':'#2c2a63'}
TXT={'#24234f':'#eceafc','#2a285c':'#eceafc','#28265d':'#eceafc','#2d2b62':'#eceafc','#20204a':'#eceafc',
'#34325f':'#cfcdee','#444267':'#cfcdee','#454363':'#cfcdee','#4f4d70':'#cfcdee','#514e7e':'#cfcdee','#5d5c7d':'#cfcdee','#66628d':'#cfcdee',
'#4541a5':'#aaa3ff','#5145e5':'#aaa3ff','var(--indigo)':'#aaa3ff','#3930bd':'#c9c4ff','var(--indigo2)':'#c9c4ff',
'#8a5cf6':'#b9a2ff','#297b68':'#6fd8b0','#a75c3c':'#f0a982','#249b77':'#62d3aa','#d78044':'#f2a66a',
'#246f59':'#7fe0bd','#855d31':'#f0c58e','#9d3146':'#ffa3b4','#8e3030':'#ffa3b4','#228262':'#62d3aa','#28a77e':'#62d3aa','#7a531f':'#f0c58e','#1d6f55':'#7fe0bd','var(--ok)':'#7fe0bd','var(--warn)':'#f0c58e','var(--err)':'#ffa3b4','#aaa8bd':'#9593b8','#9c93dc':'#8d84ff','#777696':'#a7a5cb'}
LINE={'#efedf9':'#2a2b52','#f0eef9':'#2a2b52','#f0eefb':'#2a2b52','#f0eef8':'#2a2b52','#eeeafd':'#2a2b52','#e4e0f4':'#2a2b52','#e2dff0':'#2a2b52','#dedaf7':'#2a2b52','#ded9ff':'#2a2b52','#e0dbff':'#2a2b52','#eeeaff':'#2a2b52','#f2efff':'#2a2b52',
'#d4ceff':'#3d3e7a','#ddd6ff':'#3d3e7a','#d8d0ff':'#3d3e7a','#a79aff':'#6a60dc','#a79bff':'#6a60dc','#c6bcff':'#6a60dc','#c9c1ff':'#6a60dc','#9c91f2':'#8d84ff',
'#fff':'#2e2f5a','white':'#2e2f5a','#ffd8de':'#7a2f40','#f2c7c7':'#7a2f40','#e9a3b0':'#7a2f40','#6cc4a4':'#2f8a6c','var(--ok-line)':'#2f8a6c','var(--err-line)':'#7a2f40'}
def split_top(css):
    out=[];cur='';d=0
    for ch in css:
        cur+=ch
        if ch=='{':d+=1
        elif ch=='}':
            d-=1
            if d==0:out.append(cur.strip());cur=''
    return out
def parse(css):
    css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
    css=re.sub(r'@(keyframes|property)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}','',css)
    items=[]
    for blk in split_top(css):
        if blk.startswith('@media'):
            head,body=blk.split('{',1);body=body[:-1]
            inner=[]
            for r in split_top(body):
                if r.startswith('@'):continue
                sel,decl=r.split('{',1);inner.append((sel.strip(),decl[:-1]))
            items.append((head.strip(),inner))
        elif blk.startswith('@'):continue
        else:
            sel,decl=blk.split('{',1);items.append((None,[(sel.strip(),decl[:-1])]))
    return items
def decls(d):
    out=[]
    for x in re.split(r';(?![^()]*\))',d):
        if ':' in x:
            k,v=x.split(':',1);out.append((k.strip(),v.strip()))
    return out
def sub_hex(v,table):
    def f(m):
        t=m.group(0).lower()
        return table.get(t,m.group(0))
    return re.sub(r'#[0-9a-fA-F]{3,8}\b|\bwhite\b|var\(--[a-z0-9-]+\)',f,v)
KEEP_GRAD={'#6559f6','#3930bc','#5145e5','#9e8dff','#3930bd','#5e54e9','#4438c6','#332a9f'}
def overrides(sel,d):
    ov=[]
    for k,v in decls(d):
        if k.startswith('--'):continue
        imp=' !important' if v.endswith('!important') else ''
        vv=v.replace('!important','').strip()
        if k in('background','background-color'):
            if 'gradient' in vv:continue
            n=BG.get(vv.lower())
            if n:ov.append((k,n+imp))
        elif k=='color':
            n=TXT.get(vv.lower())
            if n:ov.append((k,n+imp))
        elif k.startswith('border') or k=='outline-color' or k=='outline':
            n=sub_hex(vv,LINE)
            if n!=vv:ov.append((k,n+imp))
        elif k=='box-shadow' and '#eeeaff' in vv.lower():
            ov.append((k,vv.lower().replace('#eeeaff','rgba(170,163,255,.28)')+imp))
    return ov
def emit(sel,ov,ind=''):
    sels=[s.strip() for s in sel.split(',')]
    pre=",\n".join(ind+"html[data-theme='dark'] "+s for s in sels)
    body=' '.join('%s: %s;'%(k,v) for k,v in ov)
    return pre+' { '+body+' }'
out=[]
seen=set()
for f in SRC:
    out.append('/* --- derived from %s --- */'%f)
    for head,rules in parse(open(f).read()):
        if head is None:
            sel,d=rules[0]
            if sel.strip()==':root':continue
            ov=overrides(sel,d)
            if ov:out.append(emit(sel,ov))
        else:
            block=[]
            for sel,d in rules:
                ov=overrides(sel,d)
                if ov:block.append(emit(sel,ov,'  '))
            if block:out.append(head+' {\n'+'\n'.join(block)+'\n}')
open('tools/generated_dark.css','w').write('\n'.join(out)+'\n')
print(len(out),'blocks')
