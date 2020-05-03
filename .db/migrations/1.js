// Fix full permission

function fix(){
    print (1);
    db.objects.find().forEach((e)=>{
        if (e.access && e.access.items)
            e.access.items.forEach((i) => {
                if (i.permission == 8) {
                    print (e.name);
                    i.permission = 255;
                    db.objects.save(e);
                }
            });
    });
    
    print (2);
    db.functions.find().forEach((e)=>{
        if (e.access && e.access.items){
            e.access.items.forEach((i) => {
                if (i.permission == 8) {
                    print (e.name);
                    i.permission = 255;
                    db.functions.save(e);
                }
            });
        }
    
        if (e.access && e.access.defaultPermission == 8){
              print (e.name);
              e.access.defaultPermission = 255;
              db.functions.save(e);
        }
    });
    
    print (3);
    db.forms.find().forEach((e)=>{
        if (e.access && e.access.items)
            e.access.items.forEach((i) => {
                if (i.permission == 8) {
                    print (e.name);
                    i.permission = 255;
                    db.forms.save(e);
                }
            });
    
    });
}

fix();



